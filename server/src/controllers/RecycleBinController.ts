import { Request, Response } from 'express'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { auditService } from '../services/auditService'

export class RecycleBinController {
  // List all soft-deleted items across all entity types
  listDeletedItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { 
      page = 1, 
      limit = 50, 
      search = '',
      entityType = 'all',
      sortBy = 'deletedAt',
      sortOrder = 'desc',
      excludeCarers = 'false'
    } = req.query

    const pageNumber = parseInt(page as string)
    const pageSize = parseInt(limit as string)
    const offset = (pageNumber - 1) * pageSize

    const deletedItems: any[] = []

    // Define entity types with their queries
    const entityQueries = {
      adminUsers: async () => {
        // Skip non-carers if only fetching carers
        if (entityType === 'carers') {
          return []
        }
        
        if (entityType === 'all' || entityType === 'adminUsers') {
          const items = await prisma.adminUser.findMany({
            where: {
              deletedAt: { not: null },
              ...(search && {
                OR: [
                  { name: { contains: search as string, mode: 'insensitive' } },
                  { email: { contains: search as string, mode: 'insensitive' } }
                ]
              })
            },
            select: {
              id: true,
              name: true,
              email: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
          })
          return items.map(item => ({ ...item, entityType: 'adminUsers', displayName: item.name }))
        }
        return []
      },

      carers: async () => {
        // Skip carers if explicitly excluded (for general tab)
        if (excludeCarers === 'true') {
          return []
        }
        
        if (entityType === 'all' || entityType === 'carers') {
          const items = await prisma.carer.findMany({
            where: {
              deletedAt: { not: null },
              ...(search && {
                OR: [
                  { name: { contains: search as string, mode: 'insensitive' } },
                  { email: { contains: search as string, mode: 'insensitive' } }
                ]
              })
            },
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
          })
          return items.map(item => ({ ...item, entityType: 'carers', displayName: item.name }))
        }
        return []
      },

      carePackages: async () => {
        // Skip non-carers if only fetching carers
        if (entityType === 'carers') {
          return []
        }
        
        if (entityType === 'all' || entityType === 'carePackages') {
          const items = await prisma.carePackage.findMany({
            where: {
              deletedAt: { not: null },
              ...(search && {
                OR: [
                  { name: { contains: search as string, mode: 'insensitive' } },
                  { postcode: { contains: search as string, mode: 'insensitive' } }
                ]
              })
            },
            select: {
              id: true,
              name: true,
              postcode: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
          })
          return items.map(item => ({ ...item, entityType: 'carePackages', displayName: `${item.name} (${item.postcode})` }))
        }
        return []
      },

      tasks: async () => {
        // Skip non-carers if only fetching carers
        if (entityType === 'carers') {
          return []
        }
        
        if (entityType === 'all' || entityType === 'tasks') {
          const items = await prisma.task.findMany({
            where: {
              deletedAt: { not: null },
              ...(search && {
                name: { contains: search as string, mode: 'insensitive' }
              })
            },
            select: {
              id: true,
              name: true,
              targetCount: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
          })
          return items.map(item => ({ ...item, entityType: 'tasks', displayName: `${item.name} (Target: ${item.targetCount})` }))
        }
        return []
      },

      assessments: async () => {
        // Skip non-carers if only fetching carers
        if (entityType === 'carers') {
          return []
        }
        
        if (entityType === 'all' || entityType === 'assessments') {
          const items = await prisma.assessment.findMany({
            where: {
              deletedAt: { not: null },
              ...(search && {
                name: { contains: search as string, mode: 'insensitive' }
              })
            },
            select: {
              id: true,
              name: true,
              deletedAt: true,
              createdAt: true,
              updatedAt: true
            },
            orderBy: { [sortBy as string]: sortOrder as 'asc' | 'desc' }
          })
          return items.map(item => ({ ...item, entityType: 'assessments', displayName: item.name }))
        }
        return []
      }
    }

    // Execute queries in parallel
    const results = await Promise.all(Object.values(entityQueries).map(query => query()))
    const allItems = results.flat()

    // Apply pagination
    const total = allItems.length
    const paginatedItems = allItems.slice(offset, offset + pageSize)

    res.json({
      success: true,
      data: paginatedItems,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  })

  // Restore a soft-deleted item
  restoreItem = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { entityType, entityId } = req.body
    const admin = req.user!

    if (!entityType || !entityId) {
      throw createError(400, 'Both entityType and entityId are required')
    }

    // Map of entity types to their Prisma models and restore logic
    const entityMap: Record<string, any> = {
      adminUsers: {
        model: prisma.adminUser,
        name: 'Admin User',
        checkField: 'email'
      },
      carers: {
        model: prisma.carer,
        name: 'Carer',
        checkField: 'email'
      },
      carePackages: {
        model: prisma.carePackage,
        name: 'Care Package',
        checkField: 'name'
      },
      tasks: {
        model: prisma.task,
        name: 'Task',
        checkField: 'name'
      },
      assessments: {
        model: prisma.assessment,
        name: 'Assessment',
        checkField: 'name'
      }
    }

    const entityConfig = entityMap[entityType]
    if (!entityConfig) {
      throw createError(400, `Invalid entity type: ${entityType}`)
    }

    // Find the deleted item
    const deletedItem = await entityConfig.model.findUnique({
      where: { id: entityId }
    })

    if (!deletedItem) {
      throw createError(404, `${entityConfig.name} not found`)
    }

    if (!deletedItem.deletedAt) {
      throw createError(400, `${entityConfig.name} is not deleted`)
    }

    // Check for naming conflicts (for entities that have unique names)
    if (['carePackages', 'tasks', 'assessments'].includes(entityType)) {
      const conflictCheck = await entityConfig.model.findFirst({
        where: {
          [entityConfig.checkField]: deletedItem[entityConfig.checkField],
          deletedAt: null,
          id: { not: entityId }
        }
      })

      if (conflictCheck) {
        throw createError(409, `Cannot restore ${entityConfig.name}. Another active item with the same ${entityConfig.checkField} already exists.`)
      }
    }

    // Check for email conflicts (for users)
    if (['adminUsers', 'carers'].includes(entityType)) {
      const conflictCheck = await entityConfig.model.findFirst({
        where: {
          email: deletedItem.email,
          deletedAt: null,
          id: { not: entityId }
        }
      })

      if (conflictCheck) {
        throw createError(409, `Cannot restore ${entityConfig.name}. Another active user with the same email already exists.`)
      }
    }

    // Restore the item
    const restoredItem = await entityConfig.model.update({
      where: { id: entityId },
      data: { 
        deletedAt: null,
        isActive: true
      }
    })

    // Log the restoration
    await auditService.log({
      action: `RESTORE_${entityType.toUpperCase()}`,
      entityType: entityConfig.name,
      entityId,
      newValues: { 
        isActive: true,
        deletedAt: null
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: restoredItem,
      message: `${entityConfig.name} restored successfully`
    })
  })

  // Permanently delete an item
  permanentDelete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { entityType, entityId } = req.body
    const admin = req.user!

    if (!entityType || !entityId) {
      throw createError(400, 'Both entityType and entityId are required')
    }

    // Map of entity types to their Prisma models
    const entityMap: Record<string, any> = {
      adminUsers: {
        model: prisma.adminUser,
        name: 'Admin User'
      },
      carers: {
        model: prisma.carer,
        name: 'Carer'
      },
      carePackages: {
        model: prisma.carePackage,
        name: 'Care Package'
      },
      tasks: {
        model: prisma.task,
        name: 'Task'
      },
      assessments: {
        model: prisma.assessment,
        name: 'Assessment'
      }
    }

    const entityConfig = entityMap[entityType]
    if (!entityConfig) {
      throw createError(400, `Invalid entity type: ${entityType}`)
    }

    // Find the deleted item
    const deletedItem = await entityConfig.model.findUnique({
      where: { id: entityId }
    })

    if (!deletedItem) {
      throw createError(404, `${entityConfig.name} not found`)
    }

    if (!deletedItem.deletedAt) {
      throw createError(400, `${entityConfig.name} is not soft-deleted. Cannot permanently delete active items.`)
    }

    // Perform cascade deletion for entities with dependencies
    await prisma.$transaction(async (tx) => {
      if (entityType === 'carers') {
        // Delete all carer-related records
        
        // Delete task progress
        await tx.taskProgress.deleteMany({
          where: { carerId: entityId }
        })
        
        // Delete competency ratings
        await tx.competencyRating.deleteMany({
          where: { carerId: entityId }
        })
        
        // Delete assessment responses
        await tx.assessmentResponse.deleteMany({
          where: { carerId: entityId }
        })
        
        // Delete shift assignments
        await tx.shiftAssignment.deleteMany({
          where: { carerId: entityId }
        })
        
        // Delete rota entries
        await tx.rotaEntry.deleteMany({
          where: { carerId: entityId }
        })
        
        // Delete carer package assignments
        await tx.carerPackageAssignment.deleteMany({
          where: { carerId: entityId }
        })
        
      }

      if (entityType === 'tasks') {
        // Delete all task-related records
        
        // Delete task progress
        await tx.taskProgress.deleteMany({
          where: { taskId: entityId }
        })
        
        // Delete competency ratings
        await tx.competencyRating.deleteMany({
          where: { taskId: entityId }
        })
        
        // Delete package task assignments
        await tx.packageTaskAssignment.deleteMany({
          where: { taskId: entityId }
        })
        
        // Delete assessment task coverages
        await tx.assessmentTaskCoverage.deleteMany({
          where: { taskId: entityId }
        })
        
      }

      if (entityType === 'care-packages') {
        // Delete all care package-related records
        
        // Delete task progress
        await tx.taskProgress.deleteMany({
          where: { packageId: entityId }
        })
        
        // Delete carer package assignments
        await tx.carerPackageAssignment.deleteMany({
          where: { packageId: entityId }
        })
        
        // Delete package task assignments
        await tx.packageTaskAssignment.deleteMany({
          where: { packageId: entityId }
        })
        
        // Delete rota entries
        await tx.rotaEntry.deleteMany({
          where: { packageId: entityId }
        })
        
        // Delete shifts and their assignments
        const shifts = await tx.shift.findMany({
          where: { packageId: entityId },
          select: { id: true }
        })
        
        for (const shift of shifts) {
          await tx.shiftAssignment.deleteMany({
            where: { shiftId: shift.id }
          })
        }
        
        await tx.shift.deleteMany({
          where: { packageId: entityId }
        })
        
      }

      if (entityType === 'assessments') {
        // Delete all assessment-related records
        
        // Get all assessment responses
        const responses = await tx.assessmentResponse.findMany({
          where: { assessmentId: entityId },
          select: { id: true }
        })
        
        // Delete response details for each response
        for (const response of responses) {
          await tx.knowledgeResponse.deleteMany({
            where: { responseId: response.id }
          })
          await tx.practicalResponse.deleteMany({
            where: { responseId: response.id }
          })
          await tx.emergencyResponse.deleteMany({
            where: { responseId: response.id }
          })
        }
        
        // Delete assessment responses
        await tx.assessmentResponse.deleteMany({
          where: { assessmentId: entityId }
        })
        
        // Delete assessment structure
        await tx.knowledgeQuestion.deleteMany({
          where: { assessmentId: entityId }
        })
        await tx.practicalSkill.deleteMany({
          where: { assessmentId: entityId }
        })
        await tx.emergencyQuestion.deleteMany({
          where: { assessmentId: entityId }
        })
        await tx.assessmentTaskCoverage.deleteMany({
          where: { assessmentId: entityId }
        })
        
      }

      // Finally, delete the main entity
      if (entityType === 'carers') {
        await tx.carer.delete({ where: { id: entityId } })
      } else if (entityType === 'tasks') {
        await tx.task.delete({ where: { id: entityId } })
      } else if (entityType === 'care-packages') {
        await tx.carePackage.delete({ where: { id: entityId } })
      } else if (entityType === 'assessments') {
        await tx.assessment.delete({ where: { id: entityId } })
      } else if (entityType === 'admin-users') {
        await tx.adminUser.delete({ where: { id: entityId } })
      } else {
        // For other entity types, use the config model
        await entityConfig.model.delete({ where: { id: entityId } })
      }
      
    })

    // Log the permanent deletion
    await auditService.log({
      action: `PERMANENT_DELETE_${entityType.toUpperCase()}`,
      entityType: entityConfig.name,
      entityId,
      oldValues: deletedItem,
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      message: `${entityConfig.name} permanently deleted`
    })
  })

  // Get recycle bin summary for dashboard
  getRecycleBinSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const [
      deletedAdminUsers,
      deletedCarers,
      deletedCarePackages,
      deletedTasks,
      deletedAssessments
    ] = await Promise.all([
      prisma.adminUser.count({ where: { deletedAt: { not: null } } }),
      prisma.carer.count({ where: { deletedAt: { not: null } } }),
      prisma.carePackage.count({ where: { deletedAt: { not: null } } }),
      prisma.task.count({ where: { deletedAt: { not: null } } }),
      prisma.assessment.count({ where: { deletedAt: { not: null } } })
    ])

    const totalDeleted = deletedAdminUsers + deletedCarers + deletedCarePackages + deletedTasks + deletedAssessments

    res.json({
      success: true,
      data: {
        totalDeleted,
        byType: {
          adminUsers: deletedAdminUsers,
          carers: deletedCarers,
          carePackages: deletedCarePackages,
          tasks: deletedTasks,
          assessments: deletedAssessments
        }
      }
    })
  })

  // Cleanup old deleted items (30+ days old) - EXCLUDES CARERS for CQC compliance
  cleanupOldItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const admin = req.user!
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago

    // CQC COMPLIANCE: Exclude carers from automatic cleanup (6-year retention required)
    const entityTypes = ['adminUser', 'carePackage', 'task', 'assessment']
    const cleanupResults: any[] = []

    for (const entityType of entityTypes) {
      const model = (prisma as any)[entityType]
      if (model) {
        const deletedCount = await model.deleteMany({
          where: {
            deletedAt: {
              not: null,
              lt: cutoffDate
            }
          }
        })

        if (deletedCount.count > 0) {
          cleanupResults.push({
            entityType,
            deletedCount: deletedCount.count
          })

          // Log the cleanup
          await auditService.log({
            action: `CLEANUP_${entityType.toUpperCase()}S`,
            entityType: 'RecycleBin',
            entityId: 'bulk-cleanup',
            newValues: { deletedCount: deletedCount.count, cutoffDate },
            performedByAdminId: admin.id,
            performedByAdminName: admin.name,
            ipAddress: req.ip,
            userAgent: req.get('User-Agent')
          })
        }
      }
    }

    // Check for carers that would have been cleaned up (for informational purposes)
    const carersCount = await prisma.carer.count({
      where: {
        deletedAt: {
          not: null,
          lt: cutoffDate
        }
      }
    })

    const totalCleaned = cleanupResults.reduce((sum, result) => sum + result.deletedCount, 0)
    
    let message = `Cleanup completed. ${totalCleaned} items permanently deleted.`
    if (carersCount > 0) {
      message += ` ${carersCount} deleted carer(s) retained for CQC compliance (6-year retention required).`
    }

    res.json({
      success: true,
      data: {
        totalCleaned,
        results: cleanupResults,
        carersRetained: carersCount
      },
      message
    })
  })

}