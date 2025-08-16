import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { PASSWORD_CONFIG } from '../config/security';
import { requireAuth } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { audit, AuditAction } from '../middleware/audit';

const router = Router();
const prisma = new PrismaClient();

// Admin Users Routes

// Get all admin users (excluding soft deleted)
router.get('/admins', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    
    const admins = await prisma.adminUser.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
          ]
        })
      },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        lastLogin: true,
        invitedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: admins,
      total: admins.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin users'
    });
  }
});

// Create new admin user (invite)
router.post('/admins', 
  requireAuth,
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('tempPassword').isLength({ min: 6 }).withMessage('Temporary password must be at least 6 characters')
  ],
  audit(AuditAction.CREATE, 'AdminUser'),
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

      const { email, name, tempPassword } = req.body;

      // Check if email already exists
      const existingAdmin = await prisma.adminUser.findFirst({
        where: { 
          email,
          deletedAt: null
        }
      });

      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Admin user with this email already exists'
        });
      }

      // Hash temporary password
      const passwordHash = await bcrypt.hash(tempPassword, PASSWORD_CONFIG.BCRYPT_ROUNDS);

      const newAdmin = await prisma.adminUser.create({
        data: {
          email,
          name,
          passwordHash,
          isActive: true,
          invitedBy: req.user!.id
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          invitedBy: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Admin user invited successfully',
        data: newAdmin
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create admin user'
      });
    }
  }
);

// Update admin user
router.put('/admins/:id',
  requireAuth,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ],
  audit(AuditAction.UPDATE, 'AdminUser'),
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

      const { id } = req.params;
      const { name, email, isActive } = req.body;
      
      // Only allow updating valid AdminUser fields
      const updates: any = {};
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (isActive !== undefined) updates.isActive = isActive;

      // Check if admin exists
      const existingAdmin = await prisma.adminUser.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Admin user not found'
        });
      }

      // Prevent direct email updates - use email change system instead
      if (updates.email && updates.email !== existingAdmin.email) {
        return res.status(400).json({
          success: false,
          message: 'Email changes must be done through the secure email change process. Use the email change feature in your account settings.'
        });
      }

      const updatedAdmin = await prisma.adminUser.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        },
        select: {
          id: true,
          email: true,
          name: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          lastLogin: true,
          invitedBy: true
        }
      });

      res.json({
        success: true,
        message: 'Admin user updated successfully',
        data: updatedAdmin
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update admin user'
      });
    }
  }
);

// Soft delete admin user
router.delete('/admins/:id',
  requireAuth,
  audit(AuditAction.DELETE, 'AdminUser'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if admin exists and is not already deleted
      const existingAdmin = await prisma.adminUser.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingAdmin) {
        return res.status(404).json({
          success: false,
          message: 'Admin user not found'
        });
      }

      // Prevent self-deletion
      if (id === req.user!.id) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete your own account'
        });
      }

      // Check for dependencies (invited users, audit logs, etc.)
      const invitedUsers = await prisma.adminUser.count({
        where: { 
          invitedBy: id,
          deletedAt: null
        }
      });

      // Soft delete the admin user
      await prisma.adminUser.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Admin user deleted successfully',
        warnings: invitedUsers > 0 ? [`This admin had invited ${invitedUsers} other users`] : undefined
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete admin user'
      });
    }
  }
);

// Carer Routes

// Get all carers
router.get('/carers', requireAuth, async (req, res) => {
  try {
    const { search, fullyAssessed } = req.query;
    
    // Build where clause
    const whereClause: any = {
      deletedAt: null
    };

    // Add search filter
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const carers = await prisma.carer.findMany({
      where: whereClause,
      include: {
        competencyRatings: {
          orderBy: { setAt: 'desc' }
        },
        packageAssignments: {
          where: { isActive: true },
          include: {
            package: {
              select: { id: true, name: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });


    // Filter for fully assessed carers if requested
    let filteredCarers = carers;
    if (fullyAssessed === 'true') {
      filteredCarers = carers.filter(carer => {
        // Check if carer has competency ratings for all required areas
        const hasCompetencyRatings = carer.competencyRatings.length > 0;
        const hasRecentRating = carer.competencyRatings.some(rating => 
          rating.level !== 'NOT_ASSESSED'
        );
        return hasCompetencyRatings && hasRecentRating;
      });
    }

    // Format response data
    const formattedCarers = filteredCarers.map(carer => ({
      id: carer.id,
      name: carer.name,
      email: carer.email,
      isActive: carer.isActive,
      createdAt: carer.createdAt,
      updatedAt: carer.updatedAt,
      competencyStatus: carer.competencyRatings.length > 0 
        ? carer.competencyRatings[0].level 
        : 'NOT_ASSESSED',
      assignedPackages: carer.packageAssignments.map(assignment => ({
        id: assignment.package.id,
        name: assignment.package.name
      })),
      totalCompetencies: carer.competencyRatings.length,
      fullyAssessed: carer.competencyRatings.some(rating => rating.level !== 'NOT_ASSESSED')
    }));


    res.json({
      success: true,
      data: formattedCarers,
      total: formattedCarers.length,
      filters: {
        fullyAssessed: fullyAssessed === 'true',
        search: search || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch carers'
    });
  }
});

// Create new carer
router.post('/carers',
  requireAuth,
  [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required')
  ],
  audit(AuditAction.CREATE, 'Carer'),
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

      const { firstName, lastName, email } = req.body;
      const name = `${firstName} ${lastName}`.trim();

      // Check if email already exists
      const existingCarer = await prisma.carer.findFirst({
        where: { 
          email,
          deletedAt: null
        }
      });

      if (existingCarer) {
        return res.status(400).json({
          success: false,
          message: 'Carer with this email already exists'
        });
      }

      const newCarer = await prisma.carer.create({
        data: {
          name,
          email,
          isActive: true
        }
      });

      res.status(201).json({
        success: true,
        message: 'Carer created successfully',
        data: {
          id: newCarer.id,
          firstName: newCarer.name.split(' ')[0] || '',
          lastName: newCarer.name.split(' ').slice(1).join(' ') || '',
          email: newCarer.email,
          isActive: newCarer.isActive,
          createdAt: newCarer.createdAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create carer'
      });
    }
  }
);

// Update carer
router.put('/carers/:id',
  requireAuth,
  [
    body('name').optional().notEmpty().withMessage('Full name cannot be empty'),
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ],
  audit(AuditAction.UPDATE, 'Carer'),
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

      const { id } = req.params;
      const { name, email, isActive } = req.body;
      
      // Only allow updating valid Carer fields
      const updates: any = {};
      
      // Handle name field directly (database has name field, not firstName/lastName)
      if (name !== undefined) updates.name = name;
      if (email !== undefined) updates.email = email;
      if (isActive !== undefined) updates.isActive = isActive;

      // Check if carer exists
      const existingCarer = await prisma.carer.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingCarer) {
        return res.status(404).json({
          success: false,
          message: 'Carer not found'
        });
      }

      // Prevent direct email updates - use email change system instead
      if (updates.email && updates.email !== existingCarer.email) {
        return res.status(400).json({
          success: false,
          message: 'Email changes must be done through the secure email change process. Use the email change feature in your account settings.'
        });
      }

      const updatedCarer = await prisma.carer.update({
        where: { id },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Carer updated successfully',
        data: {
          id: updatedCarer.id,
          firstName: updatedCarer.name.split(' ')[0] || '',
          lastName: updatedCarer.name.split(' ').slice(1).join(' ') || '',
          email: updatedCarer.email,
          isActive: updatedCarer.isActive,
          updatedAt: updatedCarer.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update carer'
      });
    }
  }
);

// Soft delete carer
router.delete('/carers/:id',
  requireAuth,
  audit(AuditAction.DELETE, 'Carer'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if carer exists
      const existingCarer = await prisma.carer.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingCarer) {
        return res.status(404).json({
          success: false,
          message: 'Carer not found'
        });
      }

      // Check for dependencies
      const [shiftAssignments, currentAssignments, competencyRatings] = await Promise.all([
        prisma.shiftAssignment.count({
          where: {
            carerId: id
          }
        }),
        prisma.carerPackageAssignment.count({
          where: {
            carerId: id,
            isActive: true
          }
        }),
        prisma.competencyRating.count({
          where: {
            carerId: id
          }
        })
      ]);

      const warnings = [];
      if (shiftAssignments > 0) warnings.push(`${shiftAssignments} shift assignments will be cancelled`);
      if (currentAssignments > 0) warnings.push(`${currentAssignments} package assignments will be removed`);
      if (competencyRatings > 0) warnings.push(`${competencyRatings} competency ratings will be archived`);

      // Soft delete the carer
      await prisma.carer.update({
        where: { id },
        data: {
          deletedAt: new Date(),
          isActive: false,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Carer deleted successfully',
        warnings: warnings.length > 0 ? warnings : undefined
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete carer'
      });
    }
  }
);

export { router as usersRouter };