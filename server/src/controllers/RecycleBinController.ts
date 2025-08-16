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
              // phone: true, // Field removed - not in schema
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

  // Bulk restore multiple items
  bulkRestore = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { items } = req.body // Array of { entityType, entityId }
    const admin = req.user!

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError(400, 'Items array is required and must not be empty')
    }

    const results: any[] = []
    const errors: any[] = []

    // Process each item individually
    for (const item of items) {
      try {
        const { entityType, entityId } = item

        if (!entityType || !entityId) {
          errors.push({ entityType, entityId, error: 'Both entityType and entityId are required' })
          continue
        }

        // Use the same logic as single restore
        const entityMap: Record<string, any> = {
          adminUsers: { model: prisma.adminUser, name: 'Admin User', checkField: 'email' },
          carers: { model: prisma.carer, name: 'Carer', checkField: 'email' },
          carePackages: { model: prisma.carePackage, name: 'Care Package', checkField: 'name' },
          tasks: { model: prisma.task, name: 'Task', checkField: 'name' },
          assessments: { model: prisma.assessment, name: 'Assessment', checkField: 'name' }
        }

        const entityConfig = entityMap[entityType]
        if (!entityConfig) {
          errors.push({ entityType, entityId, error: `Invalid entity type: ${entityType}` })
          continue
        }

        // Find and validate the deleted item
        const deletedItem = await entityConfig.model.findUnique({
          where: { id: entityId }
        })

        if (!deletedItem) {
          errors.push({ entityType, entityId, error: `${entityConfig.name} not found` })
          continue
        }

        if (!deletedItem.deletedAt) {
          errors.push({ entityType, entityId, error: `${entityConfig.name} is not deleted` })
          continue
        }

        // Check for conflicts
        if (['carePackages', 'tasks', 'assessments'].includes(entityType)) {
          const conflictCheck = await entityConfig.model.findFirst({
            where: {
              [entityConfig.checkField]: deletedItem[entityConfig.checkField],
              deletedAt: null,
              id: { not: entityId }
            }
          })

          if (conflictCheck) {
            errors.push({ 
              entityType, 
              entityId, 
              error: `Cannot restore ${entityConfig.name}. Another active item with the same ${entityConfig.checkField} already exists.` 
            })
            continue
          }
        }

        if (['adminUsers', 'carers'].includes(entityType)) {
          const conflictCheck = await entityConfig.model.findFirst({
            where: {
              email: deletedItem.email,
              deletedAt: null,
              id: { not: entityId }
            }
          })

          if (conflictCheck) {
            errors.push({ 
              entityType, 
              entityId, 
              error: `Cannot restore ${entityConfig.name}. Another active user with the same email already exists.` 
            })
            continue
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
          action: `BULK_RESTORE_${entityType.toUpperCase()}`,
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

        results.push({ 
          entityType, 
          entityId, 
          success: true, 
          name: deletedItem.name || deletedItem.displayName 
        })

      } catch (error) {
        errors.push({ 
          entityType: item.entityType, 
          entityId: item.entityId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    res.json({
      success: true,
      data: {
        processed: items.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: `Bulk restore completed. ${results.length} items restored successfully${errors.length > 0 ? `, ${errors.length} failed` : ''}.`
    })
  })

  // Bulk permanent delete multiple items
  bulkPermanentDelete = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { items } = req.body // Array of { entityType, entityId }
    const admin = req.user!

    if (!items || !Array.isArray(items) || items.length === 0) {
      throw createError(400, 'Items array is required and must not be empty')
    }

    const results: any[] = []
    const errors: any[] = []

    // Process each item individually within a transaction for each item
    for (const item of items) {
      try {
        const { entityType, entityId } = item

        if (!entityType || !entityId) {
          errors.push({ entityType, entityId, error: 'Both entityType and entityId are required' })
          continue
        }

        const entityMap: Record<string, any> = {
          adminUsers: { model: prisma.adminUser, name: 'Admin User' },
          carers: { model: prisma.carer, name: 'Carer' },
          carePackages: { model: prisma.carePackage, name: 'Care Package' },
          tasks: { model: prisma.task, name: 'Task' },
          assessments: { model: prisma.assessment, name: 'Assessment' }
        }

        const entityConfig = entityMap[entityType]
        if (!entityConfig) {
          errors.push({ entityType, entityId, error: `Invalid entity type: ${entityType}` })
          continue
        }

        // Find the deleted item
        const deletedItem = await entityConfig.model.findUnique({
          where: { id: entityId }
        })

        if (!deletedItem) {
          errors.push({ entityType, entityId, error: `${entityConfig.name} not found` })
          continue
        }

        if (!deletedItem.deletedAt) {
          errors.push({ entityType, entityId, error: `${entityConfig.name} is not soft-deleted. Cannot permanently delete active items.` })
          continue
        }

        // Perform cascade deletion in transaction
        await prisma.$transaction(async (tx) => {
          // Same cascade logic as single delete
          if (entityType === 'carers') {
            await tx.taskProgress.deleteMany({ where: { carerId: entityId } })
            await tx.competencyRating.deleteMany({ where: { carerId: entityId } })
            await tx.assessmentResponse.deleteMany({ where: { carerId: entityId } })
            await tx.shiftAssignment.deleteMany({ where: { carerId: entityId } })
            await tx.rotaEntry.deleteMany({ where: { carerId: entityId } })
            await tx.carerPackageAssignment.deleteMany({ where: { carerId: entityId } })
            await tx.carer.delete({ where: { id: entityId } })
          } else if (entityType === 'tasks') {
            await tx.taskProgress.deleteMany({ where: { taskId: entityId } })
            await tx.competencyRating.deleteMany({ where: { taskId: entityId } })
            await tx.packageTaskAssignment.deleteMany({ where: { taskId: entityId } })
            await tx.assessmentTaskCoverage.deleteMany({ where: { taskId: entityId } })
            await tx.task.delete({ where: { id: entityId } })
          } else if (entityType === 'carePackages') {
            await tx.taskProgress.deleteMany({ where: { packageId: entityId } })
            await tx.carerPackageAssignment.deleteMany({ where: { packageId: entityId } })
            await tx.packageTaskAssignment.deleteMany({ where: { packageId: entityId } })
            await tx.rotaEntry.deleteMany({ where: { packageId: entityId } })
            
            const shifts = await tx.shift.findMany({
              where: { packageId: entityId },
              select: { id: true }
            })
            
            for (const shift of shifts) {
              await tx.shiftAssignment.deleteMany({ where: { shiftId: shift.id } })
            }
            
            await tx.shift.deleteMany({ where: { packageId: entityId } })
            await tx.carePackage.delete({ where: { id: entityId } })
          } else if (entityType === 'assessments') {
            const responses = await tx.assessmentResponse.findMany({
              where: { assessmentId: entityId },
              select: { id: true }
            })
            
            for (const response of responses) {
              await tx.knowledgeResponse.deleteMany({ where: { responseId: response.id } })
              await tx.practicalResponse.deleteMany({ where: { responseId: response.id } })
              await tx.emergencyResponse.deleteMany({ where: { responseId: response.id } })
            }
            
            await tx.assessmentResponse.deleteMany({ where: { assessmentId: entityId } })
            await tx.knowledgeQuestion.deleteMany({ where: { assessmentId: entityId } })
            await tx.practicalSkill.deleteMany({ where: { assessmentId: entityId } })
            await tx.emergencyQuestion.deleteMany({ where: { assessmentId: entityId } })
            await tx.assessmentTaskCoverage.deleteMany({ where: { assessmentId: entityId } })
            await tx.assessment.delete({ where: { id: entityId } })
          } else if (entityType === 'adminUsers') {
            await tx.adminUser.delete({ where: { id: entityId } })
          }
        })

        // Log the permanent deletion
        await auditService.log({
          action: `BULK_PERMANENT_DELETE_${entityType.toUpperCase()}`,
          entityType: entityConfig.name,
          entityId,
          oldValues: deletedItem,
          performedByAdminId: admin.id,
          performedByAdminName: admin.name,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        })

        results.push({ 
          entityType, 
          entityId, 
          success: true, 
          name: deletedItem.name || deletedItem.displayName 
        })

      } catch (error) {
        errors.push({ 
          entityType: item.entityType, 
          entityId: item.entityId, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        })
      }
    }

    res.json({
      success: true,
      data: {
        processed: items.length,
        successful: results.length,
        failed: errors.length,
        results,
        errors
      },
      message: `Bulk deletion completed. ${results.length} items permanently deleted${errors.length > 0 ? `, ${errors.length} failed` : ''}.`
    })
  })

  // Analyze impact before deletion - show dependencies and related data
  analyzeImpact = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { entityType, entityId } = req.query

    if (!entityType || !entityId) {
      throw createError(400, 'Both entityType and entityId are required')
    }

    // Map of entity types to their Prisma models
    const entityMap: Record<string, any> = {
      adminUsers: { model: prisma.adminUser, name: 'Admin User' },
      carers: { model: prisma.carer, name: 'Carer' },
      carePackages: { model: prisma.carePackage, name: 'Care Package' },
      tasks: { model: prisma.task, name: 'Task' },
      assessments: { model: prisma.assessment, name: 'Assessment' }
    }

    const entityConfig = entityMap[entityType as string]
    if (!entityConfig) {
      throw createError(400, `Invalid entity type: ${entityType}`)
    }

    // Find the deleted item
    const deletedItem = await entityConfig.model.findUnique({
      where: { id: entityId as string }
    })

    if (!deletedItem) {
      throw createError(404, `${entityConfig.name} not found`)
    }

    if (!deletedItem.deletedAt) {
      throw createError(400, `${entityConfig.name} is not soft-deleted`)
    }

    const impactAnalysis: any = {
      entityType: entityType as string,
      entityId: entityId as string,
      entityName: deletedItem.name || deletedItem.displayName || 'Unknown',
      deletedAt: deletedItem.deletedAt,
      dependencies: {},
      totalRecords: 0,
      hasComplexDependencies: false,
      riskLevel: 'LOW'
    }

    // Analyze dependencies based on entity type
    if (entityType === 'carers') {
      // Carer dependencies
      const [
        taskProgress,
        competencyRatings,
        assessmentResponses,
        shiftAssignments,
        rotaEntries,
        packageAssignments
      ] = await Promise.all([
        prisma.taskProgress.count({ where: { carerId: entityId as string } }),
        prisma.competencyRating.count({ where: { carerId: entityId as string } }),
        prisma.assessmentResponse.count({ where: { carerId: entityId as string } }),
        prisma.shiftAssignment.count({ where: { carerId: entityId as string } }),
        prisma.rotaEntry.count({ where: { carerId: entityId as string } }),
        prisma.carerPackageAssignment.count({ where: { carerId: entityId as string } })
      ])

      impactAnalysis.dependencies = {
        taskProgress: { count: taskProgress, description: 'Task completion records' },
        competencyRatings: { count: competencyRatings, description: 'Skill assessments' },
        assessmentResponses: { count: assessmentResponses, description: 'Assessment submissions' },
        shiftAssignments: { count: shiftAssignments, description: 'Historical shift assignments' },
        rotaEntries: { count: rotaEntries, description: 'Schedule entries' },
        packageAssignments: { count: packageAssignments, description: 'Care package assignments' }
      }

      impactAnalysis.totalRecords = taskProgress + competencyRatings + assessmentResponses + 
                                   shiftAssignments + rotaEntries + packageAssignments

      // CQC compliance warning
      impactAnalysis.complianceWarning = {
        type: 'CQC_RETENTION',
        message: 'Deleted carers must be retained for 6 years as required by CQC regulations',
        severity: 'ERROR'
      }

      if (impactAnalysis.totalRecords > 50) {
        impactAnalysis.hasComplexDependencies = true
        impactAnalysis.riskLevel = 'HIGH'
      } else if (impactAnalysis.totalRecords > 10) {
        impactAnalysis.riskLevel = 'MEDIUM'
      }

    } else if (entityType === 'tasks') {
      // Task dependencies
      const [
        taskProgress,
        competencyRatings,
        packageAssignments,
        assessmentCoverage
      ] = await Promise.all([
        prisma.taskProgress.count({ where: { taskId: entityId as string } }),
        prisma.competencyRating.count({ where: { taskId: entityId as string } }),
        prisma.packageTaskAssignment.count({ where: { taskId: entityId as string } }),
        prisma.assessmentTaskCoverage.count({ where: { taskId: entityId as string } })
      ])

      impactAnalysis.dependencies = {
        taskProgress: { count: taskProgress, description: 'Carer progress records' },
        competencyRatings: { count: competencyRatings, description: 'Competency assessments' },
        packageAssignments: { count: packageAssignments, description: 'Care package assignments' },
        assessmentCoverage: { count: assessmentCoverage, description: 'Assessment task mappings' }
      }

      impactAnalysis.totalRecords = taskProgress + competencyRatings + packageAssignments + assessmentCoverage

      if (impactAnalysis.totalRecords > 100) {
        impactAnalysis.hasComplexDependencies = true
        impactAnalysis.riskLevel = 'HIGH'
      } else if (impactAnalysis.totalRecords > 20) {
        impactAnalysis.riskLevel = 'MEDIUM'
      }

    } else if (entityType === 'carePackages') {
      // Care Package dependencies
      const [
        taskProgress,
        carerAssignments,
        packageTaskAssignments,
        rotaEntries,
        shifts
      ] = await Promise.all([
        prisma.taskProgress.count({ where: { packageId: entityId as string } }),
        prisma.carerPackageAssignment.count({ where: { packageId: entityId as string } }),
        prisma.packageTaskAssignment.count({ where: { packageId: entityId as string } }),
        prisma.rotaEntry.count({ where: { packageId: entityId as string } }),
        prisma.shift.count({ where: { packageId: entityId as string } })
      ])

      impactAnalysis.dependencies = {
        taskProgress: { count: taskProgress, description: 'Task completion records' },
        carerAssignments: { count: carerAssignments, description: 'Assigned carers' },
        packageTaskAssignments: { count: packageTaskAssignments, description: 'Task assignments' },
        rotaEntries: { count: rotaEntries, description: 'Schedule entries' },
        shifts: { count: shifts, description: 'Shift records' }
      }

      impactAnalysis.totalRecords = taskProgress + carerAssignments + packageTaskAssignments + 
                                   rotaEntries + shifts

      if (impactAnalysis.totalRecords > 200) {
        impactAnalysis.hasComplexDependencies = true
        impactAnalysis.riskLevel = 'HIGH'
      } else if (impactAnalysis.totalRecords > 50) {
        impactAnalysis.riskLevel = 'MEDIUM'
      }

    } else if (entityType === 'assessments') {
      // Assessment dependencies
      const [
        assessmentResponses,
        knowledgeQuestions,
        practicalSkills,
        emergencyQuestions,
        taskCoverage
      ] = await Promise.all([
        prisma.assessmentResponse.count({ where: { assessmentId: entityId as string } }),
        prisma.knowledgeQuestion.count({ where: { assessmentId: entityId as string } }),
        prisma.practicalSkill.count({ where: { assessmentId: entityId as string } }),
        prisma.emergencyQuestion.count({ where: { assessmentId: entityId as string } }),
        prisma.assessmentTaskCoverage.count({ where: { assessmentId: entityId as string } })
      ])

      // Count detailed responses
      const responses = await prisma.assessmentResponse.findMany({
        where: { assessmentId: entityId as string },
        select: { id: true }
      })

      let detailedResponses = 0
      for (const response of responses) {
        const [knowledge, practical, emergency] = await Promise.all([
          prisma.knowledgeResponse.count({ where: { responseId: response.id } }),
          prisma.practicalResponse.count({ where: { responseId: response.id } }),
          prisma.emergencyResponse.count({ where: { responseId: response.id } })
        ])
        detailedResponses += knowledge + practical + emergency
      }

      impactAnalysis.dependencies = {
        assessmentResponses: { count: assessmentResponses, description: 'Carer assessment submissions' },
        knowledgeQuestions: { count: knowledgeQuestions, description: 'Knowledge test questions' },
        practicalSkills: { count: practicalSkills, description: 'Practical skill assessments' },
        emergencyQuestions: { count: emergencyQuestions, description: 'Emergency scenario questions' },
        taskCoverage: { count: taskCoverage, description: 'Task coverage mappings' },
        detailedResponses: { count: detailedResponses, description: 'Individual response records' }
      }

      impactAnalysis.totalRecords = assessmentResponses + knowledgeQuestions + practicalSkills + 
                                   emergencyQuestions + taskCoverage + detailedResponses

      if (impactAnalysis.totalRecords > 500) {
        impactAnalysis.hasComplexDependencies = true
        impactAnalysis.riskLevel = 'HIGH'
      } else if (impactAnalysis.totalRecords > 100) {
        impactAnalysis.riskLevel = 'MEDIUM'
      }

    } else if (entityType === 'adminUsers') {
      // Admin User dependencies (audit logs, invitations, etc.)
      const auditLogs = await prisma.auditLog.count({ 
        where: { performedByAdminId: entityId as string } 
      })

      impactAnalysis.dependencies = {
        auditLogs: { count: auditLogs, description: 'Audit trail records' }
      }

      impactAnalysis.totalRecords = auditLogs

      if (impactAnalysis.totalRecords > 1000) {
        impactAnalysis.hasComplexDependencies = true
        impactAnalysis.riskLevel = 'HIGH'
      } else if (impactAnalysis.totalRecords > 100) {
        impactAnalysis.riskLevel = 'MEDIUM'
      }
    }

    // Add recommendations based on risk level
    impactAnalysis.recommendations = []
    
    if (impactAnalysis.riskLevel === 'HIGH') {
      impactAnalysis.recommendations.push(
        'Consider exporting data before deletion',
        'Review all dependencies carefully',
        'Ensure compliance requirements are met'
      )
    } else if (impactAnalysis.riskLevel === 'MEDIUM') {
      impactAnalysis.recommendations.push(
        'Review key dependencies',
        'Consider data backup if needed'
      )
    } else {
      impactAnalysis.recommendations.push(
        'Low risk deletion - minimal dependencies found'
      )
    }

    // Special handling for carers
    if (entityType === 'carers') {
      impactAnalysis.recommendations = [
        '⚠️  CQC COMPLIANCE: Carers must be retained for 6 years',
        'This deletion will be blocked by system policy',
        'Use the download PDF option to preserve care records'
      ]
    }

    res.json({
      success: true,
      data: impactAnalysis
    })
  })

}