import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcryptjs';
import { PASSWORD_CONFIG } from '../config/security';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { audit, AuditAction } from '../middleware/audit';
import { emailService } from '../services/EmailService';
import { emailQueueService } from '../services/EmailQueueService';
import { auditService } from '../services/auditService';
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
  async (req: Request, res: Response) => {
    console.log('🔄 [EMAIL-DEBUG] Admin invitation request received', {
      timestamp: new Date().toISOString(),
      userId: req.user?.id,
      userName: req.user?.name,
      requestBody: { email: req.body.email, name: req.body.name },
      headers: {
        authorization: req.headers.authorization ? 'Present' : 'Missing',
        'x-csrf-token': req.headers['x-csrf-token'] ? 'Present' : 'Missing'
      },
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ [EMAIL-DEBUG] Validation failed', { errors: errors.array() });
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, name } = req.body;
      console.log('✅ [EMAIL-DEBUG] Validation passed, proceeding with invitation creation');

      // Check if email already exists as admin, carer, or has pending invitation
      const [existingAdmin, existingCarer, existingInvitation] = await Promise.all([
        prisma.adminUser.findUnique({ 
          where: { email },
          select: { id: true, email: true, name: true, isActive: true, deletedAt: true }
        }),
        prisma.carer.findUnique({ 
          where: { email },
          select: { id: true, email: true, name: true, isActive: true, deletedAt: true }
        }),
        prisma.invitation.findFirst({
          where: { email },
          select: { id: true, email: true, userType: true, status: true, invitedAt: true }
        })
      ]);

      // Check for existing active admin
      if (existingAdmin && !existingAdmin.deletedAt) {
        return res.status(400).json({
          success: false,
          message: `An admin account already exists for ${email}. ${!existingAdmin.isActive ? 'The account is currently inactive - please contact an administrator to reactivate it.' : 'Please use a different email address.'}`
        });
      }

      // Check for existing active carer
      if (existingCarer && !existingCarer.deletedAt) {
        return res.status(400).json({
          success: false,
          message: `A carer account already exists for ${email}. ${!existingCarer.isActive ? 'The account is currently inactive - please contact an administrator to reactivate it.' : 'Please use a different email address.'}`
        });
      }

      // Check for soft-deleted accounts
      if ((existingAdmin && existingAdmin.deletedAt) || (existingCarer && existingCarer.deletedAt)) {
        const userType = existingAdmin ? 'admin' : 'carer';
        const userName = existingAdmin ? existingAdmin.name : existingCarer?.name;
        return res.status(400).json({
          success: false,
          message: `Email ${email} was previously used by ${userName} (${userType}). This account is in the recycle bin. Please restore the account or use a different email address.`
        });
      }

      // Check for pending invitation
      if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
        const inviteDate = new Date(existingInvitation.invitedAt).toLocaleDateString();
        const userTypeText = existingInvitation.userType === InvitationType.ADMIN ? 'admin' : 'carer';
        return res.status(400).json({
          success: false,
          message: `A pending ${userTypeText} invitation already exists for ${email} (sent on ${inviteDate}). Please wait for the user to accept the invitation or cancel the existing invitation first.`
        });
      }

      // Check for processed invitation (only if no existing users were found)
      let shouldUpdateExisting = false;
      if (existingInvitation && existingInvitation.status !== InvitationStatus.PENDING) {
        // Only block if there's also an existing user account
        // If the user account was deleted, allow new invitations
        const hasExistingAccount = (existingAdmin && !existingAdmin.deletedAt) || (existingCarer && !existingCarer.deletedAt);
        
        if (hasExistingAccount) {
          const statusText = existingInvitation.status.toLowerCase();
          const userTypeText = existingInvitation.userType === InvitationType.ADMIN ? 'admin' : 'carer';
          return res.status(400).json({
            success: false,
            message: `An invitation for ${email} was already ${statusText}. Please check if the user already has an account or use a different email address.`
          });
        } else {
          shouldUpdateExisting = true;
        }
      }

      // Generate invitation token and expiry (7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create or update invitation record
      let invitation;
      try {
        if (shouldUpdateExisting && existingInvitation) {
          // Update the existing invitation
          invitation = await prisma.invitation.update({
            where: { id: existingInvitation.id },
            data: {
              name,
              userType: InvitationType.ADMIN,
              token,
              invitedBy: req.user!.id,
              invitedAt: new Date(),
              expiresAt,
              status: InvitationStatus.PENDING,
              acceptedAt: null,
              declinedAt: null
            },
            include: {
              invitedByAdmin: {
                select: { name: true }
              }
            }
          });
        } else {
          // Create new invitation
          invitation = await prisma.invitation.create({
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
        }
      } catch (dbError: any) {
        // Handle unique constraint violations that might slip through validation
        
        if (dbError.code === 'P2002') {
          if (dbError.meta?.target?.includes('email')) {
            return res.status(400).json({
              success: false,
              message: `Email address ${email} is already in use. Please check if a user account or pending invitation already exists for this email address.`
            });
          }
          if (dbError.meta?.target?.includes('token')) {
            // Token collision is extremely rare but possible - retry with new token
            const newToken = generateInvitationToken();
            try {
              invitation = await prisma.invitation.create({
                data: {
                  email,
                  name,
                  userType: InvitationType.ADMIN,
                  token: newToken,
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
            } catch (retryError) {
              throw retryError; // Let outer catch handle this
            }
          } else {
            throw dbError; // Let outer catch handle unknown constraint violations
          }
        } else {
          throw dbError; // Let outer catch handle non-constraint errors
        }
      }

      // Send invitation email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${invitation.token}`;
      
      console.log('📧 [EMAIL-DEBUG] Attempting to queue admin invitation email', {
        to: email,
        adminName: name,
        invitedByName: invitation.invitedByAdmin.name,
        acceptUrl,
        invitationId: invitation.id
      });
      
      try {
        // PRIMARY: Try to queue admin invitation email for background processing
        await emailQueueService.queueAdminInvitation({
          to: email,
          adminName: name,
          invitedByName: invitation.invitedByAdmin.name,
          invitationToken: invitation.token,
          acceptUrl,
          expiresAt
        }, {
          priority: 5, // High priority for invitations
          userId: req.user?.id
        });
        
        console.log('✅ [EMAIL-DEBUG] Email queued successfully for processing');
      } catch (emailError: any) {
        console.error('❌ [EMAIL-DEBUG] Failed to queue admin invitation email:', emailError)
        
        // FALLBACK: Send email directly if queue fails
        console.log('🔄 [EMAIL-DEBUG] Attempting direct email fallback');
        try {
          await emailService.sendAdminInvitation({
            to: email,
            adminName: name,
            invitedByName: invitation.invitedByAdmin.name,
            invitationToken: invitation.token,
            acceptUrl,
            expiresAt
          });
          
          console.log('✅ [EMAIL-DEBUG] Direct email fallback sent successfully');
        } catch (directEmailError: any) {
          console.error('❌ [EMAIL-DEBUG] Direct email fallback also failed:', directEmailError)
          
          // Clean up the invitation if direct email fails
          if (shouldUpdateExisting && existingInvitation) {
            // Restore the previous invitation state
            await prisma.invitation.update({
              where: { id: existingInvitation.id },
              data: {
                status: existingInvitation.status,
                invitedAt: existingInvitation.invitedAt
              }
            })
          } else {
            await prisma.invitation.delete({ where: { id: invitation.id } })
          }
          
          return res.status(500).json({
            success: false,
            message: 'Failed to send invitation email. Please check email configuration.',
            error: process.env.NODE_ENV === 'development' ? directEmailError.message : undefined
          })
        }
      }

      console.log('🎉 [EMAIL-DEBUG] Admin invitation process completed successfully', {
        invitationId: invitation.id,
        email: invitation.email,
        status: invitation.status
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
      console.error('💥 [EMAIL-DEBUG] Admin invitation process failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      
      // More detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
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
    body('name').notEmpty().withMessage('Name is required')
  ],
  audit(AuditAction.CREATE, 'Invitation'),
  async (req: Request, res: Response) => {
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

      // Check if email already exists as carer, admin, or has pending invitation
      const [existingCarer, existingAdmin, existingInvitation] = await Promise.all([
        prisma.carer.findUnique({ 
          where: { email },
          select: { id: true, email: true, name: true, isActive: true, deletedAt: true }
        }),
        prisma.adminUser.findUnique({ 
          where: { email },
          select: { id: true, email: true, name: true, isActive: true, deletedAt: true }
        }),
        prisma.invitation.findFirst({
          where: { email },
          select: { id: true, email: true, userType: true, status: true, invitedAt: true }
        })
      ]);


      // Check for existing active carer
      if (existingCarer && !existingCarer.deletedAt) {
        return res.status(400).json({
          success: false,
          message: `A carer account already exists for ${email}. ${!existingCarer.isActive ? 'The account is currently inactive - please contact an administrator to reactivate it.' : 'Please use a different email address.'}`
        });
      }

      // Check for existing active admin
      if (existingAdmin && !existingAdmin.deletedAt) {
        return res.status(400).json({
          success: false,
          message: `An admin account already exists for ${email}. ${!existingAdmin.isActive ? 'The account is currently inactive - please contact an administrator to reactivate it.' : 'Please use a different email address.'}`
        });
      }

      // Check for soft-deleted accounts
      if ((existingCarer && existingCarer.deletedAt) || (existingAdmin && existingAdmin.deletedAt)) {
        const userType = existingCarer ? 'carer' : 'admin';
        const userName = existingCarer ? existingCarer.name : existingAdmin?.name;
        return res.status(400).json({
          success: false,
          message: `Email ${email} was previously used by ${userName} (${userType}). This account is in the recycle bin. Please restore the account or use a different email address.`
        });
      }

      // Check for pending invitation
      if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
        const inviteDate = new Date(existingInvitation.invitedAt).toLocaleDateString();
        const userTypeText = existingInvitation.userType === InvitationType.ADMIN ? 'admin' : 'carer';
        return res.status(400).json({
          success: false,
          message: `A pending ${userTypeText} invitation already exists for ${email} (sent on ${inviteDate}). Please wait for the user to accept the invitation or cancel the existing invitation first.`
        });
      }

      // Check for processed invitation (only if no existing users were found)
      let shouldUpdateExisting = false;
      if (existingInvitation && existingInvitation.status !== InvitationStatus.PENDING) {
        // Only block if there's also an existing user account
        // If the user account was deleted, allow new invitations
        const hasExistingAccount = (existingCarer && !existingCarer.deletedAt) || (existingAdmin && !existingAdmin.deletedAt);
        
        if (hasExistingAccount) {
          const statusText = existingInvitation.status.toLowerCase();
          const userTypeText = existingInvitation.userType === InvitationType.ADMIN ? 'admin' : 'carer';
          return res.status(400).json({
            success: false,
            message: `An invitation for ${email} was already ${statusText}. Please check if the user already has an account or use a different email address.`
          });
        } else {
          shouldUpdateExisting = true;
        }
      }

      // Generate invitation token and expiry (7 days)
      const token = generateInvitationToken();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Create or update invitation record
      let invitation;
      try {
        if (shouldUpdateExisting && existingInvitation) {
          // Update the existing invitation
          invitation = await prisma.invitation.update({
            where: { id: existingInvitation.id },
            data: {
              name,
              userType: InvitationType.CARER,
              token,
              invitedBy: req.user!.id,
              invitedAt: new Date(),
              expiresAt,
              status: InvitationStatus.PENDING,
              acceptedAt: null,
              declinedAt: null
            },
            include: {
              invitedByAdmin: {
                select: { name: true }
              }
            }
          });
        } else {
          // Create new invitation
          invitation = await prisma.invitation.create({
            data: {
              email,
              name,
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
        }
      } catch (dbError: any) {
        // Handle unique constraint violations that might slip through validation
        
        if (dbError.code === 'P2002') {
          if (dbError.meta?.target?.includes('email')) {
            return res.status(400).json({
              success: false,
              message: `Email address ${email} is already in use. Please check if a user account or pending invitation already exists for this email address.`
            });
          }
          if (dbError.meta?.target?.includes('token')) {
            // Token collision is extremely rare but possible - retry with new token
            const newToken = generateInvitationToken();
            try {
              invitation = await prisma.invitation.create({
                data: {
                  email,
                  name,
                  userType: InvitationType.CARER,
                  token: newToken,
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
            } catch (retryError) {
              throw retryError; // Let outer catch handle this
            }
          } else {
            throw dbError; // Let outer catch handle unknown constraint violations
          }
        } else {
          throw dbError; // Let outer catch handle non-constraint errors
        }
      }

      // Send invitation email
      const acceptUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/invitation/accept?token=${invitation.token}`;
      
      try {
        // Queue carer invitation email for background processing
        await emailQueueService.queueCarerInvitation({
          to: email,
          carerName: name,
          invitedByName: invitation.invitedByAdmin.name,
          invitationToken: invitation.token,
          acceptUrl,
          expiresAt
        }, {
          priority: 5, // High priority for invitations
          userId: req.user?.id
        });
      } catch (emailError: any) {
        console.error('Failed to send carer invitation email:', emailError)
        
        // Clean up the invitation if email fails
        if (shouldUpdateExisting && existingInvitation) {
          // Restore the previous invitation state
          await prisma.invitation.update({
            where: { id: existingInvitation.id },
            data: {
              status: existingInvitation.status,
              invitedAt: existingInvitation.invitedAt
            }
          })
        } else {
          await prisma.invitation.delete({ where: { id: invitation.id } })
        }
        
        return res.status(500).json({
          success: false,
          message: 'Failed to send invitation email. Please check email configuration.',
          error: process.env.NODE_ENV === 'development' ? emailError.message : undefined
        })
      }

      res.status(201).json({
        success: true,
        message: 'Carer invitation sent successfully',
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
      
      // More detailed error for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({
        success: false,
        message: 'Failed to send carer invitation',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
);

// Get invitation details (for accept page)
router.get('/accept',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token is required'
        });
      }

      // Find invitation
      const invitation = await prisma.invitation.findUnique({
        where: { token: token as string },
        include: {
          invitedByAdmin: {
            select: { name: true }
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

      // Return invitation details (without token for security)
      res.json({
        success: true,
        data: {
          email: invitation.email,
          name: invitation.name,
          userType: invitation.userType,
          invitedByName: invitation.invitedByAdmin.name,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch invitation details'
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
  async (req: Request, res: Response) => {
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
      const passwordHash = await bcrypt.hash(password, PASSWORD_CONFIG.BCRYPT_ROUNDS);

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
            name: invitation.name!,
            isActive: true
          },
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true,
            createdAt: true
          }
        });
      }

      // Mark invitation as accepted and update email and name to match user's current data
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: new Date(),
          email: newUser.email, // Update invitation email to match user's current email
          name: newUser.name    // Update invitation name to match user's current name
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
      
      // More detailed error logging
      
      res.status(500).json({
        success: false,
        message: 'Failed to accept invitation',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      });
    }
  }
);

// Decline invitation
router.post('/decline',
  [
    body('token').notEmpty().withMessage('Invitation token is required')
  ],
  async (req: Request, res: Response) => {
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
  async (req: Request, res: Response) => {
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

      // For accepted invitations, get current user data to show updated name/email
      const enhancedInvitations = await Promise.all(invitations.map(async (invitation) => {
        if (invitation.status === 'ACCEPTED') {
          try {
            let currentUserData = null;
            
            if (invitation.userType === 'ADMIN') {
              currentUserData = await prisma.adminUser.findFirst({
                where: { 
                  email: invitation.email,
                  deletedAt: null 
                },
                select: { name: true, email: true }
              });
            } else {
              currentUserData = await prisma.carer.findFirst({
                where: { 
                  email: invitation.email,
                  deletedAt: null 
                },
                select: { name: true, email: true }
              });
            }
            
            // Use current user data if found, otherwise fall back to invitation data
            if (currentUserData) {
              return {
                ...invitation,
                name: currentUserData.name,
                email: currentUserData.email
              };
            }
          } catch (error) {
                }
        }
        
        return invitation;
      }));

      res.json({
        success: true,
        data: enhancedInvitations
      });
    } catch (error) {
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
  async (req: Request, res: Response) => {
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
        await emailQueueService.queueAdminInvitation({
          to: invitation.email,
          adminName: invitation.name!,
          invitedByName: invitation.invitedByAdmin.name,
          invitationToken: newToken,
          acceptUrl,
          expiresAt: newExpiresAt
        }, {
          priority: 8, // Very high priority for resends
          userId: req.user?.id
        });
      } else {
        await emailQueueService.queueCarerInvitation({
          to: invitation.email,
          carerName: invitation.name!,
          invitedByName: invitation.invitedByAdmin.name,
          invitationToken: newToken,
          acceptUrl,
          expiresAt: newExpiresAt
        }, {
          priority: 8, // Very high priority for resends
          userId: req.user?.id
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
  async (req: Request, res: Response) => {
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
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      res.status(500).json({
        success: false,
        message: 'Failed to cancel invitation',
        error: process.env.NODE_ENV === 'development' ? errorMessage : undefined
      });
    }
  }
);

// Delete all accepted invitations (cleanup utility)
router.delete('/accepted',
  requireAuth,
  audit(AuditAction.DELETE, 'Invitation'),
  async (req: Request, res: Response) => {
    try {
      // Only allow admins to perform this operation
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      // Delete all accepted invitations
      const result = await prisma.invitation.deleteMany({
        where: {
          status: InvitationStatus.ACCEPTED
        }
      });

      res.json({
        success: true,
        message: `Successfully deleted ${result.count} accepted invitations`,
        data: {
          deletedCount: result.count
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete accepted invitations'
      });
    }
  }
);

export default router;