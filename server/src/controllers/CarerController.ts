import { Request, Response } from 'express'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { auditService } from '../services/auditService'

export class CarerController {
  // Get all carers
  listCarers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { includeDeleted = false, search = '', page = 1, limit = 50 } = req.query

    const skip = (Number(page) - 1) * Number(limit)
    
    const whereClause: any = {}
    
    if (includeDeleted !== 'true') {
      whereClause.deletedAt = null
    }
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ]
    }

    const [carers, total] = await Promise.all([
      prisma.carer.findMany({
        where: whereClause,
        include: {
          packageAssignments: {
            where: { isActive: true },
            include: {
              package: {
                select: { id: true, name: true, postcode: true }
              }
            }
          },
          competencyRatings: {
            include: {
              task: {
                select: { id: true, name: true }
              }
            }
          }
        },
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.carer.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(total / Number(limit))

    res.json({
      success: true,
      data: carers,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages
      }
    })
  })

  // Get single carer by ID
  getCarer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    const carer = await prisma.carer.findUnique({
      where: { id },
      include: {
        packageAssignments: {
          where: { isActive: true },
          include: {
            package: {
              select: { id: true, name: true, postcode: true }
            }
          }
        },
        competencyRatings: {
          include: {
            task: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!carer) {
      throw createError(404, 'Carer not found')
    }

    res.json({
      success: true,
      data: carer
    })
  })

  // Create new carer
  createCarer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, name } = req.body
    const admin = req.user!

    // Check if carer with email already exists
    const existingCarer = await prisma.carer.findFirst({
      where: { email: email.toLowerCase() }
    })

    if (existingCarer) {
      throw createError(400, 'A carer with this email already exists')
    }

    const carer = await prisma.carer.create({
      data: {
        email: email.toLowerCase(),
        name: name.trim(),
        isActive: true
      },
      include: {
        packageAssignments: {
          include: {
            package: {
              select: { id: true, name: true, postcode: true }
            }
          }
        },
        competencyRatings: {
          include: {
            task: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    // Log the creation
    await auditService.log({
      action: 'CREATE_CARER',
      entityType: 'Carer',
      entityId: carer.id,
      newValues: { email, name },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.status(201).json({
      success: true,
      data: carer,
      message: 'Carer created successfully'
    })
  })

  // Update carer
  updateCarer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const { email, name, isActive } = req.body
    const admin = req.user!

    const existingCarer = await prisma.carer.findUnique({
      where: { id, deletedAt: null }
    })

    if (!existingCarer) {
      throw createError(404, 'Carer not found')
    }

    // Check if email is being changed and if it conflicts
    if (email && email.toLowerCase() !== existingCarer.email) {
      const emailConflict = await prisma.carer.findFirst({
        where: { 
          email: email.toLowerCase(),
          id: { not: id }
        }
      })

      if (emailConflict) {
        throw createError(400, 'A carer with this email already exists')
      }
    }

    const updatedCarer = await prisma.carer.update({
      where: { id },
      data: {
        ...(email && { email: email.toLowerCase() }),
        ...(name && { name: name.trim() }),
        ...(isActive !== undefined && { isActive }),
        updatedAt: new Date()
      },
      include: {
        packageAssignments: {
          include: {
            package: {
              select: { id: true, name: true, postcode: true }
            }
          }
        },
        competencyRatings: {
          include: {
            task: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    // Log the update
    await auditService.log({
      action: 'UPDATE_CARER',
      entityType: 'Carer',
      entityId: id,
      oldValues: { 
        email: existingCarer.email, 
        name: existingCarer.name, 
        isActive: existingCarer.isActive
      },
      newValues: { email, name, isActive },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: updatedCarer,
      message: 'Carer updated successfully'
    })
  })

  // Soft delete carer
  deleteCarer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const admin = req.user!

    const carer = await prisma.carer.findUnique({
      where: { id, deletedAt: null }
    })

    if (!carer) {
      throw createError(404, 'Carer not found')
    }

    const deletedCarer = await prisma.carer.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false
      }
    })

    // Log the deletion
    await auditService.log({
      action: 'DELETE_CARER',
      entityType: 'Carer',
      entityId: id,
      oldValues: { isActive: true, deletedAt: null },
      newValues: { isActive: false, deletedAt: deletedCarer.deletedAt },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      message: `Carer "${carer.name}" deleted successfully`
    })
  })

  // Restore deleted carer
  restoreCarer = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const admin = req.user!

    const carer = await prisma.carer.findUnique({
      where: { id },
      include: {
        packageAssignments: {
          include: {
            package: {
              select: { id: true, name: true, postcode: true }
            }
          }
        }
      }
    })

    if (!carer) {
      throw createError(404, 'Carer not found')
    }

    if (!carer.deletedAt) {
      throw createError(400, 'Carer is not deleted')
    }

    const restoredCarer = await prisma.carer.update({
      where: { id },
      data: { 
        deletedAt: null,
        isActive: true,
        updatedAt: new Date()
      },
      include: {
        packageAssignments: {
          include: {
            package: {
              select: { id: true, name: true, postcode: true }
            }
          }
        },
        competencyRatings: {
          include: {
            task: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    // Log the restoration
    await auditService.log({
      action: 'RESTORE_CARER',
      entityType: 'Carer',
      entityId: id,
      oldValues: { isActive: false, deletedAt: carer.deletedAt },
      newValues: { isActive: true, deletedAt: null },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: restoredCarer,
      message: `Carer "${carer.name}" restored successfully`
    })
  })
}