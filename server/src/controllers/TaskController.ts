import { Request, Response } from 'express'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { auditService } from '../services/auditService'
import { Task } from '@caretrack/shared'

export class TaskController {
  // List all tasks with pagination and search
  listTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { 
      page = 1, 
      limit = 50, 
      search = '', 
      includeDeleted = false 
    } = req.query

    const pageNumber = parseInt(page as string)
    const pageSize = parseInt(limit as string)
    const offset = (pageNumber - 1) * pageSize

    // Build where clause
    const where: any = {
      AND: [
        // Only show deleted tasks if explicitly requested
        includeDeleted === 'true' ? {} : { deletedAt: null },
        // Add search filter if provided
        search ? {
          name: {
            contains: search as string,
            mode: 'insensitive'
          }
        } : {}
      ].filter(condition => Object.keys(condition).length > 0)
    }

    // Get total count for pagination
    const total = await prisma.task.count({ where })

    // Get tasks with relations
    const tasks = await prisma.task.findMany({
      where,
      include: {
        packageAssignments: {
          where: { isActive: true },
          include: {
            package: {
              select: { id: true, name: true }
            }
          }
        },
        competencyRatings: {
          select: { id: true, carerId: true, level: true }
        },
        assessmentTaskCoverage: {
          include: {
            assessment: {
              select: { id: true, name: true }
            }
          }
        },
        _count: {
          select: {
            packageAssignments: { where: { isActive: true } },
            competencyRatings: true,
            assessmentTaskCoverage: true
          }
        }
      },
      orderBy: [
        { deletedAt: 'asc' }, // Active tasks first
        { name: 'asc' }
      ],
      skip: offset,
      take: pageSize
    })

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page: pageNumber,
        limit: pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    })
  })

  // Get single task by ID
  getTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    const task = await prisma.task.findUnique({
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
            carer: {
              select: { id: true, name: true, email: true }
            }
          }
        },
        assessmentTaskCoverage: {
          include: {
            assessment: {
              select: { id: true, name: true }
            }
          }
        },
        taskProgress: {
          include: {
            carer: {
              select: { id: true, name: true }
            },
            package: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    if (!task) {
      throw createError(404, 'Task not found')
    }

    res.json({
      success: true,
      data: task
    })
  })

  // Create new task
  createTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { name, targetCount } = req.body
    const admin = req.user!

    // Validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      throw createError(400, 'Task name is required')
    }

    if (!targetCount || typeof targetCount !== 'number' || targetCount < 1 || targetCount > 9999) {
      throw createError(400, 'Target count must be between 1 and 9999')
    }

    // Check for duplicate name (case-insensitive, excluding deleted)
    const existingTask = await prisma.task.findFirst({
      where: {
        name: {
          equals: name.trim(),
          mode: 'insensitive'
        },
        deletedAt: null
      }
    })

    if (existingTask) {
      throw createError(409, 'A task with this name already exists')
    }

    // Create task
    const task = await prisma.task.create({
      data: {
        name: name.trim(),
        targetCount: Math.floor(targetCount)
      }
    })

    // Log the creation
    await auditService.log({
      action: 'CREATE_TASK',
      entityType: 'Task',
      entityId: task.id,
      newValues: { name: task.name, targetCount: task.targetCount },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.status(201).json({
      success: true,
      data: task,
      message: 'Task created successfully'
    })
  })

  // Update existing task
  updateTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const { name, targetCount } = req.body
    const admin = req.user!

    // Find existing task
    const existingTask = await prisma.task.findUnique({
      where: { id }
    })

    if (!existingTask) {
      throw createError(404, 'Task not found')
    }

    if (existingTask.deletedAt) {
      throw createError(400, 'Cannot update deleted task. Please restore it first.')
    }

    // Validation
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        throw createError(400, 'Task name cannot be empty')
      }

      // Check for duplicate name (case-insensitive, excluding current task and deleted)
      const duplicateTask = await prisma.task.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: 'insensitive'
          },
          deletedAt: null,
          id: { not: id }
        }
      })

      if (duplicateTask) {
        throw createError(409, 'A task with this name already exists')
      }
    }

    if (targetCount !== undefined) {
      if (typeof targetCount !== 'number' || targetCount < 1 || targetCount > 9999) {
        throw createError(400, 'Target count must be between 1 and 9999')
      }
    }

    // Prepare update data
    const updateData: any = {}
    if (name !== undefined) updateData.name = name.trim()
    if (targetCount !== undefined) updateData.targetCount = Math.floor(targetCount)

    // Update task
    const updatedTask = await prisma.task.update({
      where: { id },
      data: updateData
    })

    // Log the update
    await auditService.log({
      action: 'UPDATE_TASK',
      entityType: 'Task',
      entityId: id,
      oldValues: { 
        name: existingTask.name, 
        targetCount: existingTask.targetCount 
      },
      newValues: updateData,
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: updatedTask,
      message: 'Task updated successfully'
    })
  })

  // Soft delete task (with dependency checking)
  deleteTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const admin = req.user!

    // Find task
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            packageAssignments: { where: { isActive: true } },
            competencyRatings: true,
            assessmentTaskCoverage: true,
            taskProgress: true
          }
        }
      }
    })

    if (!task) {
      throw createError(404, 'Task not found')
    }

    if (task.deletedAt) {
      throw createError(400, 'Task is already deleted')
    }

    // Check for dependencies that require soft delete
    const dependencies = []
    if (task._count.packageAssignments > 0) {
      dependencies.push(`${task._count.packageAssignments} package assignment(s)`)
    }
    if (task._count.competencyRatings > 0) {
      dependencies.push(`${task._count.competencyRatings} competency rating(s)`)
    }
    if (task._count.assessmentTaskCoverage > 0) {
      dependencies.push(`${task._count.assessmentTaskCoverage} assessment(s)`)
    }
    if (task._count.taskProgress > 0) {
      dependencies.push(`${task._count.taskProgress} progress record(s)`)
    }

    // Soft delete the task (preserve references when dependencies exist)
    const deletedTask = await prisma.task.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isActive: false
      }
    })

    // Determine message based on dependencies
    const message = dependencies.length > 0 
      ? `Task deleted successfully. Preserved references to: ${dependencies.join(', ')}.`
      : 'Task deleted successfully'

    // Log the deletion
    await auditService.log({
      action: 'DELETE_TASK',
      entityType: 'Task',
      entityId: id,
      oldValues: { 
        name: task.name, 
        targetCount: task.targetCount,
        isActive: task.isActive
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.json({
      success: true,
      data: deletedTask,
      message
    })
  })

  // Restore soft-deleted task
  restoreTask = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const admin = req.user!

    // Find deleted task
    const task = await prisma.task.findUnique({
      where: { id }
    })

    if (!task) {
      throw createError(404, 'Task not found')
    }

    if (!task.deletedAt) {
      throw createError(400, 'Task is not deleted')
    }

    // Check for name conflicts
    const conflictingTask = await prisma.task.findFirst({
      where: {
        name: {
          equals: task.name,
          mode: 'insensitive'
        },
        deletedAt: null,
        id: { not: id }
      }
    })

    if (conflictingTask) {
      throw createError(409, `Cannot restore task. Another active task with the name "${task.name}" already exists.`)
    }

    // Restore the task
    const restoredTask = await prisma.task.update({
      where: { id },
      data: { 
        deletedAt: null,
        isActive: true
      }
    })

    // Log the restoration
    await auditService.log({
      action: 'RESTORE_TASK',
      entityType: 'Task',
      entityId: id,
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
      data: restoredTask,
      message: 'Task restored successfully'
    })
  })

  // Get task usage statistics
  getTaskUsage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    const task = await prisma.task.findUnique({
      where: { id },
      select: { id: true, name: true }
    })

    if (!task) {
      throw createError(404, 'Task not found')
    }

    // Get detailed usage statistics
    const usage = await prisma.task.findUnique({
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
            carer: {
              select: { id: true, name: true }
            }
          }
        },
        assessmentTaskCoverage: {
          include: {
            assessment: {
              select: { id: true, name: true }
            }
          }
        },
        taskProgress: {
          include: {
            carer: {
              select: { id: true, name: true }
            },
            package: {
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    res.json({
      success: true,
      data: {
        task: { id: task.id, name: task.name },
        usage: {
          packages: usage?.packageAssignments || [],
          competencyRatings: usage?.competencyRatings || [],
          assessments: usage?.assessmentTaskCoverage || [],
          progressRecords: usage?.taskProgress || []
        },
        summary: {
          packageCount: usage?.packageAssignments.length || 0,
          competencyRatingCount: usage?.competencyRatings.length || 0,
          assessmentCount: usage?.assessmentTaskCoverage.length || 0,
          progressRecordCount: usage?.taskProgress.length || 0
        }
      }
    })
  })
}