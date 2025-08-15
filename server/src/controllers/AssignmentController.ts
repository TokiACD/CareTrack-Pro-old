import { Request, Response } from 'express'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { auditService } from '../services/auditService'

export class AssignmentController {
  // Get all assignments with package-centric view
  listAssignments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { packageId, includeProgress = false } = req.query

    // Build base query with relations
    const includeOptions: any = {
      carerAssignments: {
        where: { isActive: true },
        include: {
          carer: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true
            }
          }
        }
      },
      taskAssignments: {
        where: { 
          isActive: true,
          task: {
            deletedAt: null
          }
        },
        include: {
          task: {
            select: {
              id: true,
              name: true,
              targetCount: true,
              isActive: true
            }
          }
        }
      }
    }

    // Include progress data if requested
    if (includeProgress === 'true') {
      includeOptions.taskProgress = {
        where: {
          task: {
            deletedAt: null
          }
        },
        include: {
          carer: {
            select: { id: true, name: true }
          },
          task: {
            select: { id: true, name: true }
          }
        }
      }
    }

    let packages
    if (packageId) {
      // Get specific package with assignments
      packages = await prisma.carePackage.findUnique({
        where: { 
          id: packageId as string,
          deletedAt: null 
        },
        include: includeOptions
      })

      if (!packages) {
        throw createError(404, 'Care package not found')
      }

      packages = [packages]
    } else {
      // Get all active packages with their assignments
      packages = await prisma.carePackage.findMany({
        where: { deletedAt: null },
        include: includeOptions,
        orderBy: { name: 'asc' }
      })
    }


    res.json({
      success: true,
      data: packages
    })
  })

  // Assign carer to package
  assignCarerToPackage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { carerId, packageId } = req.body
    const admin = req.user!

    // Validate input
    if (!carerId || !packageId) {
      throw createError(400, 'Both carerId and packageId are required')
    }

    // Check if carer exists and is active
    const carer = await prisma.carer.findUnique({
      where: { id: carerId, deletedAt: null, isActive: true }
    })

    if (!carer) {
      throw createError(404, 'Carer not found or inactive')
    }

    // Check if package exists and is active
    const carePackage = await prisma.carePackage.findUnique({
      where: { id: packageId, deletedAt: null }
    })

    if (!carePackage) {
      throw createError(404, 'Care package not found')
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.carerPackageAssignment.findUnique({
      where: {
        carerId_packageId: {
          carerId,
          packageId
        }
      }
    })

    if (existingAssignment && existingAssignment.isActive) {
      throw createError(409, 'Carer is already assigned to this package')
    }

    let assignment
    if (existingAssignment && !existingAssignment.isActive) {
      // Reactivate existing assignment
      assignment = await prisma.carerPackageAssignment.update({
        where: { id: existingAssignment.id },
        data: { 
          isActive: true,
          assignedAt: new Date()
        },
        include: {
          carer: {
            select: { id: true, name: true, email: true }
          },
          package: {
            select: { id: true, name: true, postcode: true }
          }
        }
      })
    } else {
      // Create new assignment
      assignment = await prisma.carerPackageAssignment.create({
        data: {
          carerId,
          packageId
        },
        include: {
          carer: {
            select: { id: true, name: true, email: true }
          },
          package: {
            select: { id: true, name: true, postcode: true }
          }
        }
      })
    }

    // SMART ASSIGNMENT FEATURES: Implement automatic inheritance
    await this.implementGlobalProgressInheritance(carerId, packageId)

    // Log the assignment
    await auditService.log({
      action: 'ASSIGN_CARER_TO_PACKAGE',
      entityType: 'CarerPackageAssignment',
      entityId: assignment.id,
      newValues: { carerId, packageId },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.status(201).json({
      success: true,
      data: assignment,
      message: `${carer.name} assigned to ${carePackage.name} successfully`
    })
  })

  // Remove carer from package
  removeCarerFromPackage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { carerId, packageId } = req.body
    const admin = req.user!

    // Validate input
    if (!carerId || !packageId) {
      throw createError(400, 'Both carerId and packageId are required')
    }

    // Find the assignment
    const assignment = await prisma.carerPackageAssignment.findUnique({
      where: {
        carerId_packageId: {
          carerId,
          packageId
        }
      },
      include: {
        carer: {
          select: { id: true, name: true }
        },
        package: {
          select: { id: true, name: true }
        }
      }
    })

    if (!assignment || !assignment.isActive) {
      throw createError(404, 'Assignment not found or already inactive')
    }

    // Check for progress data that would be affected
    const progressCount = await prisma.taskProgress.count({
      where: {
        carerId,
        packageId,
        completionCount: { gt: 0 }
      }
    })

    if (progressCount > 0) {
      // Soft deactivate to preserve progress history
      const updatedAssignment = await prisma.carerPackageAssignment.update({
        where: { id: assignment.id },
        data: { isActive: false },
        include: {
          carer: {
            select: { id: true, name: true }
          },
          package: {
            select: { id: true, name: true }
          }
        }
      })

      // Log the removal
      await auditService.log({
        action: 'REMOVE_CARER_FROM_PACKAGE',
        entityType: 'CarerPackageAssignment',
        entityId: assignment.id,
        oldValues: { isActive: true },
        newValues: { isActive: false },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        data: updatedAssignment,
        message: `${assignment.carer.name} removed from ${assignment.package.name}. Progress data preserved.`
      })
    } else {
      // No progress data, safe to delete
      await prisma.carerPackageAssignment.delete({
        where: { id: assignment.id }
      })

      // Log the removal
      await auditService.log({
        action: 'DELETE_CARER_PACKAGE_ASSIGNMENT',
        entityType: 'CarerPackageAssignment',
        entityId: assignment.id,
        oldValues: { carerId, packageId },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: `${assignment.carer.name} removed from ${assignment.package.name} successfully`
      })
    }
  })

  // Assign task to package
  assignTaskToPackage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId, packageId } = req.body
    const admin = req.user!

    // Validate input
    if (!taskId || !packageId) {
      throw createError(400, 'Both taskId and packageId are required')
    }

    // Check if task exists and is active
    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null }
    })

    if (!task) {
      throw createError(404, 'Task not found')
    }

    // Check if package exists and is active
    const carePackage = await prisma.carePackage.findUnique({
      where: { id: packageId, deletedAt: null }
    })

    if (!carePackage) {
      throw createError(404, 'Care package not found')
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.packageTaskAssignment.findUnique({
      where: {
        packageId_taskId: {
          packageId,
          taskId
        }
      }
    })

    if (existingAssignment && existingAssignment.isActive) {
      throw createError(409, 'Task is already assigned to this package')
    }

    let assignment
    if (existingAssignment && !existingAssignment.isActive) {
      // Reactivate existing assignment
      assignment = await prisma.packageTaskAssignment.update({
        where: { id: existingAssignment.id },
        data: { 
          isActive: true,
          assignedAt: new Date()
        },
        include: {
          task: {
            select: { id: true, name: true, targetCount: true }
          },
          package: {
            select: { id: true, name: true, postcode: true }
          }
        }
      })
    } else {
      // Create new assignment
      assignment = await prisma.packageTaskAssignment.create({
        data: {
          packageId,
          taskId
        },
        include: {
          task: {
            select: { id: true, name: true, targetCount: true }
          },
          package: {
            select: { id: true, name: true, postcode: true }
          }
        }
      })
    }

    // SMART ASSIGNMENT FEATURES: Implement task assignment inheritance for all carers
    await this.implementTaskAssignmentInheritance(taskId, packageId)

    // Log the assignment
    await auditService.log({
      action: 'ASSIGN_TASK_TO_PACKAGE',
      entityType: 'PackageTaskAssignment',
      entityId: assignment.id,
      newValues: { taskId, packageId },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    res.status(201).json({
      success: true,
      data: assignment,
      message: `${task.name} assigned to ${carePackage.name} successfully`
    })
  })

  // Remove task from package
  removeTaskFromPackage = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { taskId, packageId } = req.body
    const admin = req.user!

    // Validate input
    if (!taskId || !packageId) {
      throw createError(400, 'Both taskId and packageId are required')
    }

    // Find the assignment
    const assignment = await prisma.packageTaskAssignment.findUnique({
      where: {
        packageId_taskId: {
          packageId,
          taskId
        }
      },
      include: {
        task: {
          select: { id: true, name: true }
        },
        package: {
          select: { id: true, name: true }
        }
      }
    })


    if (!assignment || !assignment.isActive) {
      throw createError(404, 'Assignment not found or already inactive')
    }

    // Check for progress data that would be affected
    const progressCount = await prisma.taskProgress.count({
      where: {
        taskId,
        packageId,
        completionCount: { gt: 0 }
      }
    })

    // Check for competency ratings that would be affected
    const competencyCount = await prisma.competencyRating.count({
      where: { taskId }
    })

    if (progressCount > 0 || competencyCount > 0) {
      // Soft deactivate to preserve progress and competency history
      const updatedAssignment = await prisma.packageTaskAssignment.update({
        where: { id: assignment.id },
        data: { isActive: false },
        include: {
          task: {
            select: { id: true, name: true }
          },
          package: {
            select: { id: true, name: true }
          }
        }
      })

      // Log the removal
      await auditService.log({
        action: 'REMOVE_TASK_FROM_PACKAGE',
        entityType: 'PackageTaskAssignment',
        entityId: assignment.id,
        oldValues: { isActive: true },
        newValues: { isActive: false },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        data: updatedAssignment,
        message: `${assignment.task.name} removed from ${assignment.package.name}. Progress data preserved.`
      })
    } else {
      // No progress data, safe to delete
      await prisma.packageTaskAssignment.delete({
        where: { id: assignment.id }
      })

      // Log the removal
      await auditService.log({
        action: 'DELETE_PACKAGE_TASK_ASSIGNMENT',
        entityType: 'PackageTaskAssignment',
        entityId: assignment.id,
        oldValues: { taskId, packageId },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: `${assignment.task.name} removed from ${assignment.package.name} successfully`
      })
    }
  })

  // Get available carers for assignment (not already assigned to package)
  getAvailableCarers = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { packageId } = req.params

    // Get all active carers not assigned to this package
    const availableCarers = await prisma.carer.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        packageAssignments: {
          none: {
            packageId,
            isActive: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    })

    res.json({
      success: true,
      data: availableCarers
    })
  })

  // Get available tasks for assignment (not already assigned to package)
  getAvailableTasks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { packageId } = req.params

    // Get all active tasks not assigned to this package
    const availableTasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        packageAssignments: {
          none: {
            packageId,
            isActive: true
          }
        }
      },
      select: {
        id: true,
        name: true,
        targetCount: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    })

    res.json({
      success: true,
      data: availableTasks
    })
  })

  // Get assignment summary for dashboard
  getAssignmentSummary = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const [
      activeCarerAssignments,
      activeTaskAssignments,
      packagesWithCarers,
      packagesWithTasks
    ] = await Promise.all([
      prisma.carerPackageAssignment.count({
        where: { isActive: true }
      }),
      prisma.packageTaskAssignment.count({
        where: { isActive: true }
      }),
      prisma.carePackage.count({
        where: {
          deletedAt: null,
          carerAssignments: {
            some: { isActive: true }
          }
        }
      }),
      prisma.carePackage.count({
        where: {
          deletedAt: null,
          taskAssignments: {
            some: { isActive: true }
          }
        }
      })
    ])

    const totalAssignments = activeCarerAssignments + activeTaskAssignments

    res.json({
      success: true,
      data: {
        totalAssignments,
        activeCarerAssignments,
        activeTaskAssignments,
        packagesWithCarers,
        packagesWithTasks
      }
    })
  })

  // SMART ASSIGNMENT FEATURES: Global Progress Inheritance
  private implementGlobalProgressInheritance = asyncHandler(async (carerId: string, packageId: string): Promise<void> => {
    // Get all tasks assigned to this package
    const packageTasks = await prisma.packageTaskAssignment.findMany({
      where: {
        packageId,
        isActive: true,
        task: { deletedAt: null }
      },
      include: {
        task: {
          select: { id: true, name: true, targetCount: true }
        }
      }
    })

    // For each task in the package, check if carer has existing progress globally
    for (const packageTask of packageTasks) {
      const taskId = packageTask.taskId
      
      // Find the highest progress this carer has achieved for this task across ALL packages
      const existingProgress = await prisma.taskProgress.findMany({
        where: {
          carerId,
          taskId,
          completionCount: { gt: 0 }
        },
        orderBy: { completionCount: 'desc' },
        take: 1
      })

      // Get existing competency for this task (global per carer-task)
      const existingCompetency = await prisma.competencyRating.findUnique({
        where: {
          carerId_taskId: { carerId, taskId }
        }
      })

      if (existingProgress.length > 0) {
        const maxProgress = existingProgress[0]
        const completionPercentage = Math.min(100, Math.round((maxProgress.completionCount / packageTask.task.targetCount) * 100))

        // Create/update progress for this package-task combination with inherited progress
        await prisma.taskProgress.upsert({
          where: {
            carerId_packageId_taskId: {
              carerId,
              packageId,
              taskId
            }
          },
          update: {
            completionCount: maxProgress.completionCount,
            completionPercentage,
            lastUpdated: new Date()
          },
          create: {
            carerId,
            packageId,
            taskId,
            completionCount: maxProgress.completionCount,
            completionPercentage,
            lastUpdated: new Date()
          }
        })
      } else {
        // No existing progress, create zero progress record
        await prisma.taskProgress.upsert({
          where: {
            carerId_packageId_taskId: {
              carerId,
              packageId,
              taskId
            }
          },
          update: {
            completionCount: 0,
            completionPercentage: 0,
            lastUpdated: new Date()
          },
          create: {
            carerId,
            packageId,
            taskId,
            completionCount: 0,
            completionPercentage: 0,
            lastUpdated: new Date()
          }
        })
      }

      // Competency inheritance is automatic since competencies are global per carer-task
      // No additional action needed - existing competency will automatically apply
    }
  })

  // SMART ASSIGNMENT FEATURES: Task Assignment with Global Progress
  private implementTaskAssignmentInheritance = asyncHandler(async (taskId: string, packageId: string): Promise<void> => {
    // Get all carers assigned to this package
    const packageCarers = await prisma.carerPackageAssignment.findMany({
      where: {
        packageId,
        isActive: true,
        carer: { deletedAt: null, isActive: true }
      },
      include: {
        carer: {
          select: { id: true, name: true }
        }
      }
    })

    // Get task details
    const task = await prisma.task.findUnique({
      where: { id: taskId, deletedAt: null },
      select: { id: true, targetCount: true }
    })

    if (!task) return

    // For each carer assigned to this package, inherit their global progress for this task
    for (const carerAssignment of packageCarers) {
      const carerId = carerAssignment.carerId
      
      // Find the highest progress this carer has achieved for this task across ALL packages
      const existingProgress = await prisma.taskProgress.findMany({
        where: {
          carerId,
          taskId,
          completionCount: { gt: 0 }
        },
        orderBy: { completionCount: 'desc' },
        take: 1
      })

      if (existingProgress.length > 0) {
        const maxProgress = existingProgress[0]
        const completionPercentage = Math.min(100, Math.round((maxProgress.completionCount / task.targetCount) * 100))

        // Create/update progress for this package-task combination with inherited progress
        await prisma.taskProgress.upsert({
          where: {
            carerId_packageId_taskId: {
              carerId,
              packageId,
              taskId
            }
          },
          update: {
            completionCount: maxProgress.completionCount,
            completionPercentage,
            lastUpdated: new Date()
          },
          create: {
            carerId,
            packageId,
            taskId,
            completionCount: maxProgress.completionCount,
            completionPercentage,
            lastUpdated: new Date()
          }
        })
      } else {
        // No existing progress, create zero progress record
        await prisma.taskProgress.upsert({
          where: {
            carerId_packageId_taskId: {
              carerId,
              packageId,
              taskId
            }
          },
          update: {
            completionCount: 0,
            completionPercentage: 0,
            lastUpdated: new Date()
          },
          create: {
            carerId,
            packageId,
            taskId,
            completionCount: 0,
            completionPercentage: 0,
            lastUpdated: new Date()
          }
        })
      }
    }
  })
}