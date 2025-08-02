import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { audit, AuditAction } from '../middleware/audit';
import { emailService } from '../services/emailService';
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
  async (req, res) => {
    try {
      console.log('🔍 Admin invitation request body:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Admin invitation validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, name } = req.body;
      console.log('✅ Admin invitation validation passed, checking business logic...');

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
          console.log('❌ Admin invitation failed: processed invitation found with existing account');
          const statusText = existingInvitation.status.toLowerCase();
          const userTypeText = existingInvitation.userType === InvitationType.ADMIN ? 'admin' : 'carer';
          return res.status(400).json({
            success: false,
            message: `An invitation for ${email} was already ${statusText}. Please check if the user already has an account or use a different email address.`
          });
        } else {
          console.log('ℹ️ Admin invitation: Found processed invitation but no existing account, will update existing invitation');
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
        console.error('🚨 Database error in carer invitation creation:', dbError);
        console.error('🚨 Error code:', dbError.code);
        console.error('🚨 Error meta:', dbError.meta);
        
        if (dbError.code === 'P2002') {
          if (dbError.meta?.target?.includes('email')) {
            console.log('🚨 Handling email constraint violation for:', email);
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
      
      await emailService.sendAdminInvitation({
        to: email,
        adminName: name,
        invitedByName: invitation.invitedByAdmin.name,
        invitationToken: invitation.token,
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
    body('name').notEmpty().withMessage('Name is required')
  ],
  audit(AuditAction.CREATE, 'Invitation'),
  async (req, res) => {
    try {
      console.log('🔍 Carer invitation request body:', req.body);
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Carer invitation validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { email, name } = req.body;
      console.log('✅ Carer invitation validation passed, checking business logic...');

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

      console.log('🔍 Carer invitation database checks:', {
        existingCarer: existingCarer ? { id: existingCarer.id, email: existingCarer.email, isActive: existingCarer.isActive, deletedAt: existingCarer.deletedAt } : null,
        existingAdmin: existingAdmin ? { id: existingAdmin.id, email: existingAdmin.email, isActive: existingAdmin.isActive, deletedAt: existingAdmin.deletedAt } : null,
        existingInvitation: existingInvitation ? { id: existingInvitation.id, email: existingInvitation.email, status: existingInvitation.status, userType: existingInvitation.userType } : null
      });

      // Check for existing active carer
      if (existingCarer && !existingCarer.deletedAt) {
        console.log('❌ Carer invitation failed: existing active carer found');
        return res.status(400).json({
          success: false,
          message: `A carer account already exists for ${email}. ${!existingCarer.isActive ? 'The account is currently inactive - please contact an administrator to reactivate it.' : 'Please use a different email address.'}`
        });
      }

      // Check for existing active admin
      if (existingAdmin && !existingAdmin.deletedAt) {
        console.log('❌ Carer invitation failed: existing active admin found');
        return res.status(400).json({
          success: false,
          message: `An admin account already exists for ${email}. ${!existingAdmin.isActive ? 'The account is currently inactive - please contact an administrator to reactivate it.' : 'Please use a different email address.'}`
        });
      }

      // Check for soft-deleted accounts
      if ((existingCarer && existingCarer.deletedAt) || (existingAdmin && existingAdmin.deletedAt)) {
        console.log('❌ Carer invitation failed: soft-deleted account found');
        const userType = existingCarer ? 'carer' : 'admin';
        const userName = existingCarer ? existingCarer.name : existingAdmin?.name;
        return res.status(400).json({
          success: false,
          message: `Email ${email} was previously used by ${userName} (${userType}). This account is in the recycle bin. Please restore the account or use a different email address.`
        });
      }

      // Check for pending invitation
      if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
        console.log('❌ Carer invitation failed: pending invitation found');
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
          console.log('❌ Carer invitation failed: processed invitation found with existing account');
          const statusText = existingInvitation.status.toLowerCase();
          const userTypeText = existingInvitation.userType === InvitationType.ADMIN ? 'admin' : 'carer';
          return res.status(400).json({
            success: false,
            message: `An invitation for ${email} was already ${statusText}. Please check if the user already has an account or use a different email address.`
          });
        } else {
          console.log('ℹ️ Carer invitation: Found processed invitation but no existing account, will update existing invitation');
          shouldUpdateExisting = true;
        }
      }

      // Generate invitation token and expiry (7 days)
      console.log('✅ Carer invitation all checks passed, creating/updating invitation...');
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
        console.error('🚨 Database error in carer invitation creation:', dbError);
        console.error('🚨 Error code:', dbError.code);
        console.error('🚨 Error meta:', dbError.meta);
        
        if (dbError.code === 'P2002') {
          if (dbError.meta?.target?.includes('email')) {
            console.log('🚨 Handling email constraint violation for:', email);
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
      
      await emailService.sendCarerInvitation({
        to: email,
        carerName: name,
        invitedByName: invitation.invitedByAdmin.name,
        invitationToken: invitation.token,
        acceptUrl,
        expiresAt
      });

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

// Get invitation details (for accept page)
router.get('/accept',
  async (req, res) => {
    try {
      const { token } = req.query;
      console.log('🔍 GET /accept - Token received:', token);

      if (!token) {
        console.log('❌ No token provided');
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

      console.log('🔍 Invitation found:', invitation ? 'Yes' : 'No');
      if (invitation) {
        console.log('🔍 Invitation status:', invitation.status);
        console.log('🔍 Invitation expires:', invitation.expiresAt);
        console.log('🔍 Current time:', new Date());
      }

      if (!invitation) {
        console.log('❌ Invalid invitation token');
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      // Check if invitation is still valid
      if (invitation.status !== InvitationStatus.PENDING) {
        console.log('❌ Invitation already processed, status:', invitation.status);
        return res.status(400).json({
          success: false,
          message: 'This invitation has already been processed'
        });
      }

      if (new Date() > invitation.expiresAt) {
        console.log('❌ Invitation expired:', invitation.expiresAt, 'vs current:', new Date());
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
      console.log('✅ Invitation details returned successfully');
      res.json({
        success: true,
        data: {
          email: invitation.email,
          name: invitation.name,
          phone: invitation.phone,
          userType: invitation.userType,
          invitedByName: invitation.invitedByAdmin.name,
          expiresAt: invitation.expiresAt
        }
      });
    } catch (error) {
      console.error('Error fetching invitation details:', error);
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
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
    body('phone').notEmpty().withMessage('Phone number is required').isMobilePhone('any').withMessage('Valid phone number required')
  ],
  async (req, res) => {
    try {
      console.log('🔍 Accept invitation request:', { token: req.body.token ? 'present' : 'missing', password: req.body.password ? 'present' : 'missing' });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('❌ Validation errors:', errors.array());
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array()
        });
      }

      const { token, password, phone } = req.body;

      // Find invitation
      console.log('🔍 Looking for invitation with token...');
      const invitation = await prisma.invitation.findUnique({
        where: { token },
        include: {
          invitedByAdmin: {
            select: { id: true, name: true }
          }
        }
      });

      if (!invitation) {
        console.log('❌ Invitation not found');
        return res.status(400).json({
          success: false,
          message: 'Invalid invitation token'
        });
      }

      console.log('✅ Invitation found:', { email: invitation.email, status: invitation.status, userType: invitation.userType });

      // Check if invitation is still valid
      if (invitation.status !== InvitationStatus.PENDING) {
        console.log('❌ Invitation not pending:', invitation.status);
        return res.status(400).json({
          success: false,
          message: 'This invitation has already been processed'
        });
      }

      if (new Date() > invitation.expiresAt) {
        console.log('❌ Invitation expired:', invitation.expiresAt);
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

      console.log('✅ Invitation is valid, proceeding with user creation');

      // Hash password
      console.log('🔐 Hashing password...');
      const passwordHash = await bcrypt.hash(password, 12);

      let newUser;

      if (invitation.userType === InvitationType.ADMIN) {
        console.log('👤 Creating admin user...');
        // Create admin user
        newUser = await prisma.adminUser.create({
          data: {
            email: invitation.email,
            name: invitation.name!,
            phone: phone,
            passwordHash,
            isActive: true,
            invitedBy: invitation.invitedBy
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
      } else {
        // Create carer
        newUser = await prisma.carer.create({
          data: {
            email: invitation.email,
            name: invitation.name!,
            phone: phone, // Phone is required from user input
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
      console.error('❌ Error accepting invitation:', error);
      
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
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
            console.error('Error fetching current user data for invitation:', invitation.id, error);
          }
        }
        
        return invitation;
      }));

      res.json({
        success: true,
        data: enhancedInvitations
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
          carerName: invitation.name!,
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

// Delete all accepted invitations (cleanup utility)
router.delete('/accepted',
  requireAuth,
  audit(AuditAction.DELETE, 'Invitation'),
  async (req, res) => {
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
      console.error('Error deleting accepted invitations:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete accepted invitations'
      });
    }
  }
);

export default router;