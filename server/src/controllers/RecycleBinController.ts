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
      sortOrder = 'desc'
    } = req.query

    const pageNumber = parseInt(page as string)
    const pageSize = parseInt(limit as string)
    const offset = (pageNumber - 1) * pageSize

    const deletedItems: any[] = []

    // Define entity types with their queries
    const entityQueries = {
      adminUsers: async () => {
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

    // Check if item has dependencies (implement basic checks)
    // This is a safety measure to prevent data integrity issues
    if (entityType === 'carers') {
      const assignments = await prisma.carerPackageAssignment.count({
        where: { carerId: entityId }
      })
      const competencies = await prisma.competencyRating.count({
        where: { carerId: entityId }
      })
      
      if (assignments > 0 || competencies > 0) {
        throw createError(409, `Cannot permanently delete carer. Has ${assignments} assignment(s) and ${competencies} competency rating(s).`)
      }
    }

    if (entityType === 'tasks') {
      const assignments = await prisma.packageTaskAssignment.count({
        where: { taskId: entityId }
      })
      const competencies = await prisma.competencyRating.count({
        where: { taskId: entityId }
      })
      
      if (assignments > 0 || competencies > 0) {
        throw createError(409, `Cannot permanently delete task. Has ${assignments} assignment(s) and ${competencies} competency rating(s).`)
      }
    }

    // Permanently delete the item
    await entityConfig.model.delete({
      where: { id: entityId }
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

  // Cleanup old deleted items (30+ days old)
  cleanupOldItems = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const admin = req.user!
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30) // 30 days ago

    const entityTypes = ['adminUser', 'carer', 'carePackage', 'task', 'assessment']
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

    const totalCleaned = cleanupResults.reduce((sum, result) => sum + result.deletedCount, 0)

    res.json({
      success: true,
      data: {
        totalCleaned,
        results: cleanupResults
      },
      message: `Cleanup completed. ${totalCleaned} items permanently deleted.`
    })
  })

  // Debug endpoint to check deleted carers directly
  debugDeletedCarers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const deletedCarers = await prisma.carer.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true,
        name: true,
        email: true,
        deletedAt: true,
        isActive: true
      }
    })

    res.json({
      success: true,
      data: deletedCarers,
      count: deletedCarers.length
    })
  })
}