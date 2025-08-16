import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { audit, AuditAction } from '../middleware/audit';

const router = Router();
const prisma = new PrismaClient();

// Custom validator for UK postcode outward code (first part only for privacy)
const postcodeValidator = (value: string) => {
  if (!value) {
    throw new Error('Postcode is required');
  }
  
  // Remove spaces and convert to uppercase for validation
  const cleanedPostcode = value.replace(/\s/g, '').toUpperCase();
  
  // UK postcode outward code pattern (first part only)
  // Formats: A9, A99, AA9, AA99, A9A, AA9A (e.g., M1, M60, SW1A, B33)
  const ukOutwardCodePattern = /^[A-Z]{1,2}[0-9]{1,2}[A-Z]?$/;
  
  if (!ukOutwardCodePattern.test(cleanedPostcode)) {
    throw new Error('Please enter a valid UK postcode area (e.g., SW1A, M1, B33, E14)');
  }
  
  return true;
};

// Helper function to format UK outward postcode consistently
const formatPostcode = (postcode: string): string => {
  // Just clean and uppercase - no space needed for outward code only
  return postcode.replace(/\s/g, '').toUpperCase();
};

// Get all care packages (excluding soft deleted)
router.get('/', requireAuth, async (req, res) => {
  try {
    const { search } = req.query;
    
    const carePackages = await prisma.carePackage.findMany({
      where: {
        deletedAt: null,
        ...(search && {
          OR: [
            { name: { contains: search as string, mode: 'insensitive' } },
            { postcode: { contains: search as string, mode: 'insensitive' } }
          ]
        })
      },
      include: {
        carerAssignments: {
          where: { isActive: true },
          include: {
            carer: {
              select: { id: true, name: true }
            }
          }
        },
        taskAssignments: {
          where: { isActive: true },
          include: {
            task: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: {
            carerAssignments: {
              where: { isActive: true }
            },
            taskAssignments: {
              where: { isActive: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const formattedPackages = carePackages.map(pkg => ({
      id: pkg.id,
      name: pkg.name,
      postcode: pkg.postcode,
      isActive: pkg.isActive,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt,
      assignedCarers: pkg.carerAssignments.map(assignment => ({
        id: assignment.carer.id,
        name: assignment.carer.name
      })),
      assignedTasks: pkg.taskAssignments.map(assignment => ({
        id: assignment.task.id,
        name: assignment.task.name
      })),
      carerCount: pkg._count.carerAssignments,
      taskCount: pkg._count.taskAssignments
    }));

    res.json({
      success: true,
      data: formattedPackages,
      total: formattedPackages.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch care packages'
    });
  }
});

// Create new care package
router.post('/', 
  requireAuth,
  [
    body('name').notEmpty().withMessage('Package name is required'),
    body('postcode').custom(postcodeValidator)
  ],
  audit(AuditAction.CREATE, 'CarePackage'),
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

      const { name, postcode } = req.body;

      // Check if package name already exists
      const existingPackage = await prisma.carePackage.findFirst({
        where: { 
          name,
          deletedAt: null
        }
      });

      if (existingPackage) {
        return res.status(400).json({
          success: false,
          message: 'Care package with this name already exists'
        });
      }

      let newPackage;
      try {
        newPackage = await prisma.carePackage.create({
          data: {
            name,
            postcode: formatPostcode(postcode),
            isActive: true
          }
        });
      } catch (error: any) {
        // Handle potential database constraint violations
        if (error.code === 'P2002') {
          return res.status(409).json({
            success: false,
            message: 'Package name already exists'
          });
        }
        
        console.error('Database error creating care package:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to create care package due to database error'
        });
      }

      res.status(201).json({
        success: true,
        message: 'Care package created successfully',
        data: {
          id: newPackage.id,
          name: newPackage.name,
          postcode: newPackage.postcode,
          isActive: newPackage.isActive,
          createdAt: newPackage.createdAt,
          assignedCarers: [],
          assignedTasks: [],
          carerCount: 0,
          taskCount: 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create care package'
      });
    }
  }
);

// Update care package
router.put('/:id',
  requireAuth,
  [
    body('name').optional().notEmpty().withMessage('Package name cannot be empty'),
    body('postcode').optional().custom(postcodeValidator),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean')
  ],
  audit(AuditAction.UPDATE, 'CarePackage'),
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
      const updates = req.body;

      // Check if package exists
      const existingPackage = await prisma.carePackage.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingPackage) {
        return res.status(404).json({
          success: false,
          message: 'Care package not found'
        });
      }

      // Check name uniqueness if name is being updated
      if (updates.name && updates.name !== existingPackage.name) {
        const nameExists = await prisma.carePackage.findFirst({
          where: { 
            name: updates.name,
            deletedAt: null,
            id: { not: id }
          }
        });

        if (nameExists) {
          return res.status(400).json({
            success: false,
            message: 'Package name already in use'
          });
        }
      }

      // Format postcode if it's being updated
      const formattedUpdates = { ...updates };
      if (formattedUpdates.postcode) {
        formattedUpdates.postcode = formatPostcode(formattedUpdates.postcode);
      }

      let updatedPackage;
      try {
        updatedPackage = await prisma.carePackage.update({
          where: { id },
          data: {
            ...formattedUpdates,
            updatedAt: new Date()
          },
          include: {
            carerAssignments: {
              where: { isActive: true },
              include: {
                carer: {
                  select: { id: true, name: true }
                }
              }
            },
            taskAssignments: {
              where: { isActive: true },
              include: {
                task: {
                  select: { id: true, name: true }
                }
              }
            },
            _count: {
              select: {
                carerAssignments: {
                  where: { isActive: true }
                },
                taskAssignments: {
                  where: { isActive: true }
                }
              }
            }
          }
        });
      } catch (error: any) {
        // Handle potential database constraint violations
        if (error.code === 'P2002') {
          return res.status(409).json({
            success: false,
            message: 'Package name already exists'
          });
        }
        
        console.error('Database error updating care package:', error);
        return res.status(500).json({
          success: false,
          message: 'Failed to update care package due to database error'
        });
      }

      res.json({
        success: true,
        message: 'Care package updated successfully',
        data: {
          id: updatedPackage.id,
          name: updatedPackage.name,
          postcode: updatedPackage.postcode,
          isActive: updatedPackage.isActive,
          createdAt: updatedPackage.createdAt,
          updatedAt: updatedPackage.updatedAt,
          assignedCarers: updatedPackage.carerAssignments.map(assignment => ({
            id: assignment.carer.id,
            name: assignment.carer.name
          })),
          assignedTasks: updatedPackage.taskAssignments.map(assignment => ({
            id: assignment.task.id,
            name: assignment.task.name
          })),
          carerCount: updatedPackage._count.carerAssignments,
          taskCount: updatedPackage._count.taskAssignments
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update care package'
      });
    }
  }
);

// Soft delete care package
router.delete('/:id',
  requireAuth,
  audit(AuditAction.DELETE, 'CarePackage'),
  async (req, res) => {
    try {
      const { id } = req.params;

      // Check if package exists and is not already deleted
      const existingPackage = await prisma.carePackage.findFirst({
        where: { id, deletedAt: null }
      });

      if (!existingPackage) {
        return res.status(404).json({
          success: false,
          message: 'Care package not found'
        });
      }

      // Check for dependencies
      const [activeCarerAssignments, activeTaskAssignments, activeShifts, futureRotaEntries, taskProgressRecords] = await Promise.all([
        prisma.carerPackageAssignment.count({
          where: {
            packageId: id,
            isActive: true
          }
        }),
        prisma.packageTaskAssignment.count({
          where: {
            packageId: id,
            isActive: true
          }
        }),
        prisma.shift.count({
          where: {
            packageId: id
          }
        }),
        prisma.rotaEntry.count({
          where: {
            packageId: id,
            date: { gt: new Date() }
          }
        }),
        prisma.taskProgress.count({
          where: {
            packageId: id
          }
        })
      ]);

      const warnings = [];
      if (activeCarerAssignments > 0) warnings.push(`${activeCarerAssignments} carer assignments will be deactivated`);
      if (activeTaskAssignments > 0) warnings.push(`${activeTaskAssignments} task assignments will be deactivated`);
      if (activeShifts > 0) warnings.push(`${activeShifts} shifts will be affected`);
      if (futureRotaEntries > 0) warnings.push(`${futureRotaEntries} future rota entries will be affected`);
      if (taskProgressRecords > 0) warnings.push(`${taskProgressRecords} task progress records will be preserved`);

      // Perform soft delete with transaction to handle cascading
      await prisma.$transaction(async (tx) => {
        // Deactivate carer assignments
        if (activeCarerAssignments > 0) {
          await tx.carerPackageAssignment.updateMany({
            where: {
              packageId: id,
              isActive: true
            },
            data: {
              isActive: false
            }
          });
        }

        // Deactivate task assignments
        if (activeTaskAssignments > 0) {
          await tx.packageTaskAssignment.updateMany({
            where: {
              packageId: id,
              isActive: true
            },
            data: {
              isActive: false
            }
          });
        }

        // Soft delete the package
        await tx.carePackage.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            isActive: false,
            updatedAt: new Date()
          }
        });
      });

      res.json({
        success: true,
        message: 'Care package deleted successfully',
        warnings: warnings.length > 0 ? warnings : undefined
      });
    } catch (error) {
      res.status(500).json({
        success: false,  
        message: 'Failed to delete care package'
      });
    }
  }
);

// Restore care package (for recycle bin functionality)
router.post('/:id/restore',
  requireAuth,
  audit(AuditAction.UPDATE, 'CarePackage'),
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Check if package exists and is soft deleted
      const deletedPackage = await prisma.carePackage.findFirst({
        where: { id, deletedAt: { not: null } }
      });

      if (!deletedPackage) {
        return res.status(404).json({
          success: false,
          message: 'Deleted care package not found'
        });
      }

      // Check if package name would conflict
      const existingPackage = await prisma.carePackage.findFirst({
        where: { 
          name: deletedPackage.name,
          deletedAt: null,
          id: { not: id }
        }
      });

      if (existingPackage) {
        return res.status(400).json({
          success: false,
          message: 'Cannot restore: A package with this name already exists'
        });
      }

      // Restore the package
      const restoredPackage = await prisma.carePackage.update({
        where: { id },
        data: {
          deletedAt: null,
          isActive: true,
          updatedAt: new Date()
        }
      });

      res.json({
        success: true,
        message: 'Care package restored successfully',
        data: {
          id: restoredPackage.id,
          name: restoredPackage.name,
          postcode: restoredPackage.postcode,
          isActive: restoredPackage.isActive,
          createdAt: restoredPackage.createdAt,
          updatedAt: restoredPackage.updatedAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to restore care package'
      });
    }
  }
);

export { router as carePackageRoutes };