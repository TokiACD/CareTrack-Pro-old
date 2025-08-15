import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import crypto from 'crypto';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { audit, AuditAction } from '../middleware/audit';
import { emailService } from '../services/EmailService';

const router = Router();

// Request email change
router.post('/request',
  requireAuth,
  [
    body('newEmail').isEmail().withMessage('Valid email is required'),
    body('userType').isIn(['ADMIN', 'CARER']).withMessage('Valid user type is required'),
    body('targetUserId').optional().isString().withMessage('Target user ID must be a string'),
    body('targetUserEmail').optional().isEmail().withMessage('Target user email must be valid')
  ],
  audit(AuditAction.UPDATE, 'EmailChange'),
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

      const { newEmail, userType, targetUserId, targetUserEmail } = req.body;
      
      // Determine if this is an admin changing another user's email
      const isAdminChangingOtherUser = targetUserId && targetUserEmail;
      
      let userId: string;
      let oldEmail: string;
      let userName: string;
      
      if (isAdminChangingOtherUser) {
        // Admin is changing another user's email
        userId = targetUserId;
        oldEmail = targetUserEmail;
        
        // Look up the target user's name
        if (userType === 'ADMIN') {
          const targetUser = await prisma.adminUser.findUnique({
            where: { id: targetUserId },
            select: { name: true, email: true }
          });
          if (!targetUser) {
            return res.status(404).json({
              success: false,
              message: 'Target user not found'
            });
          }
          userName = targetUser.name;
          oldEmail = targetUser.email; // Use actual current email from DB
        } else {
          const targetUser = await prisma.carer.findUnique({
            where: { id: targetUserId },
            select: { name: true, email: true }
          });
          if (!targetUser) {
            return res.status(404).json({
              success: false,
              message: 'Target user not found'
            });
          }
          userName = targetUser.name;
          oldEmail = targetUser.email; // Use actual current email from DB
        }
      } else {
        // User is changing their own email
        userId = req.user!.id;
        oldEmail = req.user!.email;
        userName = req.user!.name;
      }

      // Check if new email is the same as current
      if (newEmail === oldEmail) {
        return res.status(400).json({
          success: false,
          message: 'New email must be different from current email'
        });
      }

      // Check if new email already exists in system
      const [existingAdmin, existingCarer] = await Promise.all([
        prisma.adminUser.findFirst({
          where: { email: newEmail, deletedAt: null }
        }),
        prisma.carer.findFirst({
          where: { email: newEmail, deletedAt: null }
        })
      ]);

      if (existingAdmin || existingCarer) {
        return res.status(400).json({
          success: false,
          message: 'Email address is already in use'
        });
      }

      // Cancel any existing pending email change requests for this user
      await prisma.emailChangeRequest.updateMany({
        where: {
          userId,
          userType,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      // Generate secure token
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      // Create email change request
      const emailChangeRequest = await prisma.emailChangeRequest.create({
        data: {
          userId,
          userType,
          oldEmail,
          newEmail,
          token,
          expiresAt
        }
      });

      // Generate URLs
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/email-change/verify?token=${token}`;
      const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/email-change/cancel?token=${token}`;

      // Send notification to old email
      await emailService.sendEmailChangeNotification({
        to: oldEmail,
        name: userName,
        newEmail,
        cancelUrl,
        initiatedByAdmin: isAdminChangingOtherUser ? req.user!.name : undefined,
        isAdminChange: isAdminChangingOtherUser
      });

      // Send verification to new email
      await emailService.sendEmailChangeVerification({
        to: newEmail,
        name: userName,
        oldEmail,
        verifyUrl,
        expiresAt,
        initiatedByAdmin: isAdminChangingOtherUser ? req.user!.name : undefined,
        isAdminChange: isAdminChangingOtherUser
      });

      res.json({
        success: true,
        message: 'Email change request initiated. Please check both your old and new email addresses.',
        data: {
          requestId: emailChangeRequest.id,
          expiresAt: emailChangeRequest.expiresAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to request email change'
      });
    }
  }
);

// Verify email change
router.post('/verify',
  [
    body('token').notEmpty().withMessage('Token is required')
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

      // Find email change request
      const emailChangeRequest = await prisma.emailChangeRequest.findUnique({
        where: { token }
      });

      if (!emailChangeRequest) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification token'
        });
      }

      // Check if already verified or cancelled
      if (emailChangeRequest.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Email change request has already been processed'
        });
      }

      // Check if expired
      if (new Date() > emailChangeRequest.expiresAt) {
        await prisma.emailChangeRequest.update({
          where: { id: emailChangeRequest.id },
          data: { status: 'EXPIRED' }
        });

        return res.status(400).json({
          success: false,
          message: 'Email change request has expired'
        });
      }

      // Check if new email is still available
      const [existingAdmin, existingCarer] = await Promise.all([
        prisma.adminUser.findFirst({
          where: { 
            email: emailChangeRequest.newEmail, 
            deletedAt: null,
            id: { not: emailChangeRequest.userId }
          }
        }),
        prisma.carer.findFirst({
          where: { 
            email: emailChangeRequest.newEmail, 
            deletedAt: null,
            id: { not: emailChangeRequest.userId }
          }
        })
      ]);

      if (existingAdmin || existingCarer) {
        return res.status(400).json({
          success: false,
          message: 'Email address is no longer available'
        });
      }

      // Update user email
      if (emailChangeRequest.userType === 'ADMIN') {
        await prisma.adminUser.update({
          where: { id: emailChangeRequest.userId },
          data: { 
            email: emailChangeRequest.newEmail,
            updatedAt: new Date()
          }
        });
      } else {
        await prisma.carer.update({
          where: { id: emailChangeRequest.userId },
          data: { 
            email: emailChangeRequest.newEmail,
            updatedAt: new Date()
          }
        });
      }

      // Mark request as verified
      await prisma.emailChangeRequest.update({
        where: { id: emailChangeRequest.id },
        data: {
          status: 'VERIFIED',
          verifiedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Email address successfully updated',
        data: {
          userId: emailChangeRequest.userId,
          userType: emailChangeRequest.userType,
          newEmail: emailChangeRequest.newEmail
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to verify email change'
      });
    }
  }
);

// Cancel email change
router.post('/cancel',
  [
    body('token').notEmpty().withMessage('Token is required')
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

      // Find email change request
      const emailChangeRequest = await prisma.emailChangeRequest.findUnique({
        where: { token }
      });


      if (!emailChangeRequest) {
        return res.status(400).json({
          success: false,
          message: 'Invalid cancellation token'
        });
      }

      // Check if already processed
      if (emailChangeRequest.status !== 'PENDING') {
        return res.status(400).json({
          success: false,
          message: 'Email change request has already been processed'
        });
      }

      // Cancel the request
      await prisma.emailChangeRequest.update({
        where: { id: emailChangeRequest.id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Email change request cancelled successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to cancel email change'
      });
    }
  }
);

// Get email change request details (for verification page)
router.get('/details',
  async (req: Request, res: Response) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Token is required'
        });
      }

      // Find email change request
      const emailChangeRequest = await prisma.emailChangeRequest.findUnique({
        where: { token: token as string }
      });

      if (!emailChangeRequest) {
        return res.status(400).json({
          success: false,
          message: 'Invalid token'
        });
      }

      // Return details (without sensitive info)
      res.json({
        success: true,
        data: {
          oldEmail: emailChangeRequest.oldEmail,
          newEmail: emailChangeRequest.newEmail,
          status: emailChangeRequest.status,
          expiresAt: emailChangeRequest.expiresAt,
          isExpired: new Date() > emailChangeRequest.expiresAt,
          userType: emailChangeRequest.userType
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch email change details'
      });
    }
  }
);

export { router as emailChangeRoutes };