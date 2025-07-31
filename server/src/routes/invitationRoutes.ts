import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { audit, AuditAction } from '../middleware/audit';
import { emailService } from '../services/emailService';
import { InvitationType, InvitationStatus } from '@caretrack/shared';

const router = Router();

// Generate secure invitation token
const generateInvitationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Send admin invitation
router.post('/admin',
  requireAuth,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Name is required')
  ],
  audit(AuditAction.CREATE, 'Invitation'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, name } = req.body;

      // Check if email already exists as admin or has pending invitation
      const [existingAdmin, existingInvitation] = await Promise.all([
        prisma.adminUser.findUnique({ where: { email } }),
        prisma.invitation.findFirst({
          where: {
            email,
            userType: InvitationType.ADMIN,
            status: InvitationStatus.PENDING
          }
        })
      ]);

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'An admin with this email already exists'
        });
      }

      if (existingInvitation) {
        return res.status(400).json({
          success: false,
          message: 'A pending invitation already exists for this email'
        });
      }

      // Generate invitation token and expiry (7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation record
      const invitation = await prisma.invitation.create({
        data: {
          email,
          name,
          userType: InvitationType.ADMIN,
          token,
          invitedBy: req.user!.id,
          expiresAt,
          status: InvitationStatus.PENDING
        },
        include: {
          invitedByAdmin: {
            select: { name: true }
          }
        }
      });

      // Send invitation email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${token}`;
      
      await emailService.sendAdminInvitation({
        to: email,
        adminName: name,
        invitedByName: invitation.invitedByAdmin.name,
        invitationToken: token,
        acceptUrl,
        expiresAt
      });

      res.status(201).json({
        success: true,
        message: 'Admin invitation sent successfully',
        data: {
          id: invitation.id,
          email: invitation.email,
          name: invitation.name,
          userType: invitation.userType,
          invitedAt: invitation.invitedAt,
          expiresAt: invitation.expiresAt,
          status: invitation.status
        }
      });
    } catch (error) {
      console.error('Error sending admin invitation:', error);
      
      // More detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send admin invitation',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
);

// Send carer invitation
router.post('/carer',
  requireAuth,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('phone').optional().isMobilePhone('en-GB').withMessage('Valid UK phone number required')
  ],
  audit(AuditAction.CREATE, 'Invitation'),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, firstName, lastName, phone } = req.body;

      // Check if email already exists as carer or has pending invitation
      const [existingCarer, existingInvitation] = await Promise.all([
        prisma.carer.findUnique({ where: { email } }),
        prisma.invitation.findFirst({
          where: {
            email,
            userType: InvitationType.CARER,
            status: InvitationStatus.PENDING
          }
        })
      ]);

      if (existingCarer) {
        return res.status(400).json({
          success: false,
          message: 'A carer with this email already exists'
        });
      }

      if (existingInvitation) {
        return res.status(400).json({
          success: false,
          message: 'A pending invitation already exists for this email'
        });
      }

      // Generate invitation token and expiry (7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create invitation record
      const invitation = await prisma.invitation.create({
        data: {
          email,
          firstName,
          lastName,
          phone,
          userType: InvitationType.CARER,
          token,
          invitedBy: req.user!.id,
          expiresAt,
          status: InvitationStatus.PENDING
        },
        include: {
          invitedByAdmin: {
            select: { name: true }
          }
        }
      });

      // Send invitation email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${token}`;
      
      await emailService.sendCarerInvitation({
        to: email,
        firstName,
        lastName,
        invitedByName: invitation.invitedByAdmin.name,
        invitationToken: token,
        acceptUrl,
        expiresAt
      });

      res.status(201).json({
        success: true,
        message: 'Carer invitation sent successfully',
        data: {
          id: invitation.id,
          email: invitation.email,
          firstName: invitation.firstName,
          lastName: invitation.lastName,
          phone: invitation.phone,
          userType: invitation.userType,
          invitedAt: invitation.invitedAt,
          expiresAt: invitation.expiresAt,
          status: invitation.status
        }
      });
    } catch (error) {
      console.error('Error sending carer invitation:', error);
      
      // More detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      res.status(500).json({
        success: false,
        message: 'Failed to send carer invitation',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
);

// Accept invitation
router.post('/accept',
  [
    body('token').notEmpty().withMessage('Invitation token is required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, password } = req.body;

      // Find invitation
      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
          invitedByAdmin: {
            select: { id: true, name: true }
          }
        }
      });

      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      // Check if invitation is still valid
      if (invitation.status !== InvitationStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'This invitation has already been processed'
        });
      }

      if (new Date() > invitation.expiresAt) {
        // Mark as expired
        await prisma.invitation.update({
          where: { id: invitation.id },
          data: { status: InvitationStatus.EXPIRED }
        });

        return res.status(400).json({
          success: false,
          message: 'This invitation has expired'
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 12);

      let newUser;

      if (invitation.userType === InvitationType.ADMIN) {
        // Create admin user
        newUser = await prisma.adminUser.create({
          data: {
            email: invitation.email,
            name: invitation.name!,
            passwordHash,
            isActive: true,
            invitedBy: invitation.invitedBy
          },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true
          }
        });
      } else {
        // Create carer
        newUser = await prisma.carer.create({
          data: {
            email: invitation.email,
            name: `${invitation.firstName} ${invitation.lastName}`,
            phone: invitation.phone || '',
            isActive: true
          },
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            isActive: true,
            createdAt: true
          }
        });
      }

      // Mark invitation as accepted
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      });

      res.status(201).json({
        success: true,
        message: `${invitation.userType.toLowerCase()} account created successfully`,
        data: {
          user: newUser,
          userType: invitation.userType
        }
      });
    } catch (error) {
      console.error('Error accepting invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation'
      });
    }
  }
);

// Decline invitation
router.post('/decline',
  [
    body('token').notEmpty().withMessage('Invitation token is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token } = req.body;

      // Find and update invitation
      const invitation = await prisma.invitation.findUnique({
        where: { token }
      });

      if (!invitation) {
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'This invitation has already been processed'
        });
      }

      // Mark invitation as declined
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.DECLINED,
          declinedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Invitation declined successfully'
      });
    } catch (error) {
      console.error('Error declining invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to decline invitation'
      });
    }
  }
);

// List pending invitations (admin only)
router.get('/',
  requireAuth,
  async (req, res) => {
    try {
      const { status, userType } = req.query;

      const whereClause: any = {};
      
      if (status) {
        whereClause.status = status;
      }
      
      if (userType) {
        whereClause.userType = userType;
      }

      const invitations = await prisma.invitation.findMany({
        where: whereClause,
        include: {
          invitedByAdmin: {
            select: { name: true }
          }
        },
        orderBy: { invitedAt: 'desc' }
      });

      res.json({
        success: true,
        data: invitations
      });
    } catch (error) {
      console.error('Error fetching invitations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch invitations'
      });
    }
  }
);

// Resend invitation
router.post('/resend/:id',
  requireAuth,
  audit(AuditAction.UPDATE, 'Invitation'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const invitation = await prisma.invitation.findUnique({
        where: { id },
        include: {
          invitedByAdmin: {
            select: { name: true }
          }
        }
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found'
        });
      }

      if (invitation.status !== InvitationStatus.PENDING) {
        return res.status(400).json({
          success: false,
          message: 'Cannot resend a processed invitation'
        });
      }

      // Generate new token and extend expiry
      const newToken = generateInvitationToken();
      const newExpiresAt = new Date();
      newExpiresAt.setDate(newExpiresAt.getDate() + 7);

      // Update invitation
      const updatedInvitation = await prisma.invitation.update({
        where: { id },
        data: {
          token: newToken,
          expiresAt: newExpiresAt
        }
      });

      // Resend email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${newToken}`;

      if (invitation.userType === InvitationType.ADMIN) {
        await emailService.sendAdminInvitation({
          to: invitation.email,
          adminName: invitation.name!,
          invitedByName: invitation.invitedByAdmin.name,
          invitationToken: newToken,
          acceptUrl,
          expiresAt: newExpiresAt
        });
      } else {
        await emailService.sendCarerInvitation({
          to: invitation.email,
          firstName: invitation.firstName!,
          lastName: invitation.lastName!,
          invitedByName: invitation.invitedByAdmin.name,
          invitationToken: newToken,
          acceptUrl,
          expiresAt: newExpiresAt
        });
      }

      res.json({
        success: true,
        message: 'Invitation resent successfully',
        data: {
          id: updatedInvitation.id,
          expiresAt: updatedInvitation.expiresAt
        }
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to resend invitation'
      });
    }
  }
);

// Delete/Cancel invitation
router.delete('/:id',
  requireAuth,
  audit(AuditAction.DELETE, 'Invitation'),
  async (req, res) => {
    try {
      const { id } = req.params;

      const invitation = await prisma.invitation.findUnique({
        where: { id }
      });

      if (!invitation) {
        return res.status(404).json({
          success: false,
          message: 'Invitation not found'
        });
      }

      if (invitation.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Can only cancel pending invitations'
        });
      }

      // Delete the invitation
      await prisma.invitation.delete({
        where: { id }
      });

      res.json({
        success: true,
        message: 'Invitation cancelled successfully'
      });
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      res.status(500).json({
        success: false,
        message: 'Failed to cancel invitation',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
);

export default router;