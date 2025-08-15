import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { auditService } from '../services/auditService';

interface CarerProgressSummary {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  packageCount: number;
  overallProgress: number;
  needsAssessment: boolean;
  lastActivity?: Date;
  packages?: CarerPackageProgress[];
}

interface CarerPackageProgress {
  packageId: string;
  packageName: string;
  packagePostcode: string;
  assignedAt: Date;
  tasks: TaskProgressDetail[];
  averageProgress: number;
  competencyRatings: CompetencyRatingDetail[];
}

interface TaskProgressDetail {
  taskId: string;
  taskName: string;
  targetCount: number;
  completionCount: number;
  completionPercentage: number;
  competencyLevel: string;
  competencySource: string;
  lastUpdated?: Date;
  canTakeAssessment: boolean;
  assessmentId?: string;
  assessmentName?: string;
}

interface CompetencyRatingDetail {
  taskId: string;
  taskName: string;
  level: string;
  source: string;
  setAt: Date;
  setByAdminName?: string;
  notes?: string;
}

export class ProgressController {
  // Get all carers with progress summaries (OPTIMIZED - NO N+1 QUERIES)
  async getCarerProgressSummaries(req: Request, res: Response, next: NextFunction) {
    try {
      const { search } = req.query;

      // Base query for carers
      const whereClause: any = {
        deletedAt: null,
        isActive: true
      };

      // Add search filter if provided
      if (search && typeof search === 'string') {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } }
        ];
      }

      // OPTIMIZED: Single query to get all carers with related data
      const carers = await prisma.carer.findMany({
        where: whereClause,
        include: {
          packageAssignments: {
            where: { isActive: true },
            select: { id: true } // Only count, don't need full data
          },
          taskProgress: {
            select: {
              completionPercentage: true,
              taskId: true,
              lastUpdated: true
            },
            orderBy: { lastUpdated: 'desc' }
          },
          competencyRatings: {
            select: { taskId: true } // Only need task IDs for checking
          }
        },
        orderBy: { name: 'asc' }
      });

      // OPTIMIZED: Process all data in memory instead of additional queries
      const progressSummaries: CarerProgressSummary[] = carers.map((carer) => {
        const packageCount = carer.packageAssignments.length;
        const taskProgress = carer.taskProgress;
        const competencyTaskIds = new Set(carer.competencyRatings.map(c => c.taskId));

        // Calculate overall progress
        let totalProgress = 0;
        let taskCount = taskProgress.length;
        
        for (const progress of taskProgress) {
          totalProgress += progress.completionPercentage;
        }

        const overallProgress = taskCount > 0 ? totalProgress / taskCount : 0;

        // Check if needs assessment (>90% completion with no competency)
        let needsAssessment = false;
        for (const progress of taskProgress) {
          if (progress.completionPercentage >= 90 && !competencyTaskIds.has(progress.taskId)) {
            needsAssessment = true;
            break;
          }
        }

        // Get last activity date (already ordered by lastUpdated desc)
        const lastActivity = taskProgress.length > 0 ? taskProgress[0].lastUpdated : undefined;

        return {
          id: carer.id,
          name: carer.name,
          email: carer.email,
          // phone field removed - not in schema
          isActive: carer.isActive,
          packageCount,
          overallProgress: Math.round(overallProgress),
          needsAssessment,
          lastActivity
        };
      });

      res.json({
        success: true,
        data: progressSummaries
      });
    } catch (error) {
      next(error);
    }
  }

  // Get detailed progress for a specific carer (OPTIMIZED - SINGLE COMPLEX QUERY)
  async getCarerDetailedProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.params;

      // OPTIMIZED: Single comprehensive query with all related data
      const carerData = await prisma.carer.findUnique({
        where: { id: carerId, deletedAt: null },
        include: {
          packageAssignments: {
            where: { isActive: true },
            include: {
              package: {
                select: { id: true, name: true, postcode: true },
                include: {
                  taskAssignments: {
                    where: { isActive: true },
                    include: {
                      task: {
                        select: { id: true, name: true, targetCount: true }
                      }
                    },
                    orderBy: { assignedAt: 'desc' }
                  }
                }
              }
            },
            orderBy: { assignedAt: 'desc' }
          },
          taskProgress: true,
          competencyRatings: {
            include: {
              task: {
                select: { id: true, name: true }
              }
            },
            orderBy: { setAt: 'desc' }
          }
        }
      });

      if (!carerData) {
        return res.status(404).json({
          success: false,
          error: 'Carer not found'
        });
      }

      // Extract data from the comprehensive query result
      const carer = {
        id: carerData.id,
        name: carerData.name,
        email: carerData.email,
        // phone field removed - not in schema
        isActive: carerData.isActive
      };

      const packageAssignments = carerData.packageAssignments;
      const taskProgressData = carerData.taskProgress;
      const competencyRatings = carerData.competencyRatings;

      // Get all unique task IDs for assessment lookup
      const allTaskIds = new Set<string>();
      packageAssignments.forEach(assignment => {
        assignment.package.taskAssignments.forEach(taskAssignment => {
          allTaskIds.add(taskAssignment.taskId);
        });
      });

      // OPTIMIZED: Single query for assessment coverage
      const assessmentTaskCoverage = await prisma.assessmentTaskCoverage.findMany({
        where: {
          taskId: { in: Array.from(allTaskIds) }
        },
        include: {
          assessment: {
            select: { id: true, name: true, isActive: true }
          }
        }
      });

      // OPTIMIZED: Create lookup maps for O(1) access instead of O(n) searches
      const taskProgressMap = new Map<string, any>();
      const competencyMap = new Map<string, any>();
      const assessmentMap = new Map<string, any>();

      // Populate lookup maps
      taskProgressData.forEach(tp => {
        const key = `${tp.packageId}-${tp.taskId}`;
        taskProgressMap.set(key, tp);
      });

      competencyRatings.forEach(c => {
        competencyMap.set(c.taskId, c);
      });

      assessmentTaskCoverage.forEach(atc => {
        assessmentMap.set(atc.taskId, atc.assessment);
      });

      // Group task progress by package using optimized data structure
      const packageProgress: CarerPackageProgress[] = packageAssignments.map(assignment => {
        const tasks: TaskProgressDetail[] = assignment.package.taskAssignments.map(taskAssignment => {
          const progressKey = `${assignment.packageId}-${taskAssignment.taskId}`;
          const progressData = taskProgressMap.get(progressKey);
          const competency = competencyMap.get(taskAssignment.taskId);
          const assessment = assessmentMap.get(taskAssignment.taskId);
          
          // Use actual progress data or defaults for unstarted tasks
          const completionCount = progressData?.completionCount || 0;
          const completionPercentage = progressData?.completionPercentage || 0;
          const lastUpdated = progressData?.lastUpdated || assignment.assignedAt;
          
          // Check if can take assessment (when task is complete and part of an active assessment)
          const canTakeAssessment = completionPercentage >= 100 && !competency && Boolean(assessment?.isActive);

          return {
            taskId: taskAssignment.taskId,
            taskName: taskAssignment.task.name,
            targetCount: taskAssignment.task.targetCount,
            completionCount,
            completionPercentage,
            competencyLevel: competency?.level || 'NOT_ASSESSED',
            competencySource: competency?.source || 'NONE',
            lastUpdated,
            canTakeAssessment,
            assessmentId: assessment?.id || undefined,
            assessmentName: assessment?.name || undefined
          };
        });

        // Calculate average progress
        const averageProgress = tasks.length > 0 
          ? Math.round(tasks.reduce((sum, task) => sum + task.completionPercentage, 0) / tasks.length)
          : 0;

        return {
          packageId: assignment.package.id,
          packageName: assignment.package.name,
          packagePostcode: assignment.package.postcode,
          assignedAt: assignment.assignedAt,
          tasks,
          averageProgress,
          competencyRatings: [] // Will be populated below
        };
      });

      // Build competency ratings summary (already have the data from main query)
      const competencyRatingsSummary: CompetencyRatingDetail[] = competencyRatings.map(competency => ({
        taskId: competency.taskId,
        taskName: competency.task.name,
        level: competency.level,
        source: competency.source,
        setAt: competency.setAt,
        setByAdminName: competency.setByAdminName || undefined,
        notes: competency.notes || undefined
      }));

      const detailedProgress = {
        carer,
        packages: packageProgress,
        competencyRatings: competencyRatingsSummary
      };

      res.json({
        success: true,
        data: detailedProgress
      });
    } catch (error) {
      console.error('Error in getCarerDetailedProgress:', {
        carerId: req.params.carerId,
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Invalid UUID')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid carer ID format'
          });
        }
        if (error.message.includes('connection')) {
          return res.status(503).json({
            success: false,
            error: 'Database connection error. Please try again.'
          });
        }
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error while fetching carer progress',
        details: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.message : 'Unknown error' : undefined
      });
    }
  }

  // Update task progress for a carer
  async updateTaskProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId, taskId, packageId } = req.body;
      const { completionCount } = req.body;

      if (!carerId || !taskId || !packageId || completionCount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: carerId, taskId, packageId, completionCount'
        });
      }

      // Verify the assignment exists
      const assignment = await prisma.carerPackageAssignment.findFirst({
        where: {
          carerId,
          packageId,
          isActive: true
        }
      });

      if (!assignment) {
        return res.status(404).json({
          success: false,
          error: 'Carer is not assigned to this package'
        });
      }

      // Get task to calculate percentage
      const task = await prisma.task.findUnique({
        where: { id: taskId, deletedAt: null }
      });

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found'
        });
      }

      const completionPercentage = Math.min(100, Math.round((completionCount / task.targetCount) * 100));

      // Update or create progress record
      const progress = await prisma.taskProgress.upsert({
        where: {
          carerId_packageId_taskId: {
            carerId,
            packageId,
            taskId
          }
        },
        update: {
          completionCount,
          completionPercentage,
          lastUpdated: new Date()
        },
        create: {
          carerId,
          packageId,
          taskId,
          completionCount,
          completionPercentage,
          lastUpdated: new Date()
        }
      });

      // SMART ASSIGNMENT FEATURES: Sync progress globally across all packages where carer is assigned to this task
      await this.syncGlobalProgress(carerId, taskId, completionCount, task.targetCount);

      // Log the update
      await auditService.log({
        action: 'UPDATE_TASK_PROGRESS',
        entityType: 'TaskProgress',
        entityId: progress.id,
        newValues: { completionCount, completionPercentage },
        performedByAdminId: req.user?.id || 'system',
        performedByAdminName: req.user?.name || 'System',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: progress,
        message: 'Task progress updated successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Reset task progress for a carer
  async resetTaskProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId, taskId, packageId } = req.body;

      if (!carerId || !taskId || !packageId) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: carerId, taskId, packageId'
        });
      }

      // Find existing progress record
      const existingProgress = await prisma.taskProgress.findUnique({
        where: {
          carerId_packageId_taskId: {
            carerId,
            packageId,
            taskId
          }
        }
      });

      if (!existingProgress) {
        return res.status(404).json({
          success: false,
          error: 'Progress record not found'
        });
      }

      // Reset progress to 0
      const resetProgress = await prisma.taskProgress.update({
        where: {
          carerId_packageId_taskId: {
            carerId,
            packageId,
            taskId
          }
        },
        data: {
          completionCount: 0,
          completionPercentage: 0,
          lastUpdated: new Date()
        }
      });

      // Log the reset
      await auditService.log({
        action: 'RESET_TASK_PROGRESS',
        entityType: 'TaskProgress',
        entityId: resetProgress.id,
        oldValues: existingProgress,
        newValues: { completionCount: 0, completionPercentage: 0 },
        performedByAdminId: req.user?.id || 'system',
        performedByAdminName: req.user?.name || 'System',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: resetProgress,
        message: 'Task progress reset successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Set manual competency rating with confirmation management
  async setManualCompetency(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId, taskId, level, notes, skipConfirmation = false } = req.body;

      if (!carerId || !taskId || !level) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: carerId, taskId, level'
        });
      }

      // Validate competency level
      const validLevels = ['NOT_ASSESSED', 'NOT_COMPETENT', 'ADVANCED_BEGINNER', 'COMPETENT', 'PROFICIENT', 'EXPERT'];
      if (!validLevels.includes(level)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid competency level'
        });
      }

      // Get existing rating to check if this is a new rating
      const existingRating = await prisma.competencyRating.findUnique({
        where: { carerId_taskId: { carerId, taskId } }
      });

      const isNewRating = !existingRating;
      const requiresConfirmation = isNewRating && !skipConfirmation && level !== 'NOT_ASSESSED';

      // If setting to NOT_ASSESSED, also reset task progress
      if (level === 'NOT_ASSESSED') {
        await prisma.$transaction(async (tx) => {
          // Delete competency rating
          await tx.competencyRating.deleteMany({
            where: { carerId, taskId }
          });

          // Delete any pending confirmations
          await tx.competencyConfirmation.deleteMany({
            where: { carerId, taskId, confirmedAt: null }
          });

          // Reset all task progress for this carer and task across all packages
          await tx.taskProgress.updateMany({
            where: { carerId, taskId },
            data: {
              completionCount: 0,
              completionPercentage: 0,
              lastUpdated: new Date()
            }
          });
        });

        await auditService.log({
          action: 'RESET_COMPETENCY_AND_PROGRESS',
          entityType: 'CompetencyRating',
          entityId: `${carerId}-${taskId}`,
          oldValues: { level: existingRating?.level || 'NONE' },
          newValues: { level: 'NOT_ASSESSED', progressReset: true },
          performedByAdminId: req.user?.id || 'system',
          performedByAdminName: req.user?.name || 'System',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.json({
          success: true,
          message: 'Competency reset and task progress cleared successfully'
        });
      }

      let result;

      if (requiresConfirmation) {
        // Create confirmation record instead of immediate rating
        result = await prisma.competencyConfirmation.create({
          data: {
            carerId,
            taskId,
            newLevel: level,
            source: 'MANUAL',
            setByAdminId: req.user?.id,
            setByAdminName: req.user?.name,
            notes,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
          }
        });

        await auditService.log({
          action: 'CREATE_COMPETENCY_CONFIRMATION',
          entityType: 'CompetencyConfirmation',
          entityId: result.id,
          newValues: { level, source: 'MANUAL', notes },
          performedByAdminId: req.user?.id || 'system',
          performedByAdminName: req.user?.name || 'System',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.json({
          success: true,
          data: result,
          message: 'Competency rating created and pending carer confirmation',
          requiresConfirmation: true
        });
      } else {
        // Apply rating immediately (existing ratings or inherited from previous assignments)
        result = await prisma.competencyRating.upsert({
          where: {
            carerId_taskId: { carerId, taskId }
          },
          update: {
            level,
            source: 'MANUAL',
            setByAdminId: req.user?.id,
            setByAdminName: req.user?.name,
            setAt: new Date(),
            notes
          },
          create: {
            carerId,
            taskId,
            level,
            source: 'MANUAL',
            setByAdminId: req.user?.id,
            setByAdminName: req.user?.name,
            setAt: new Date(),
            notes
          }
        });

        await auditService.log({
          action: 'SET_MANUAL_COMPETENCY',
          entityType: 'CompetencyRating',
          entityId: result.id,
          oldValues: { level: existingRating?.level },
          newValues: { level, source: 'MANUAL', notes },
          performedByAdminId: req.user?.id || 'system',
          performedByAdminName: req.user?.name || 'System',
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        });

        return res.json({
          success: true,
          data: result,
          message: 'Manual competency rating set successfully',
          requiresConfirmation: false
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async getCarerAssessmentResponses(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.params;

      // Verify carer exists
      const carer = await prisma.carer.findUnique({
        where: { id: carerId, deletedAt: null },
        select: { id: true, name: true, email: true }
      });

      if (!carer) {
        return res.status(404).json({
          success: false,
          error: 'Carer not found'
        });
      }

      // Get all assessment responses for this carer
      const assessmentResponses = await prisma.assessmentResponse.findMany({
        where: { carerId: carerId },
        include: {
          assessment: {
            select: { 
              id: true, 
              name: true,
              knowledgeQuestions: { 
                orderBy: { order: 'asc' },
                select: { id: true, question: true, modelAnswer: true, order: true }
              },
              practicalSkills: { 
                orderBy: { order: 'asc' },
                select: { id: true, skillDescription: true, canBeNotApplicable: true, order: true }
              },
              emergencyQuestions: { 
                orderBy: { order: 'asc' },
                select: { id: true, question: true, modelAnswer: true, order: true }
              },
              tasksCovered: {
                include: {
                  task: {
                    select: { id: true, name: true }
                  }
                }
              }
            }
          },
          assessor: {
            select: { id: true, name: true }
          },
          knowledgeResponses: {
            include: {
              question: {
                select: { id: true, question: true, modelAnswer: true, order: true }
              }
            },
            orderBy: { question: { order: 'asc' } }
          },
          practicalResponses: {
            include: {
              skill: {
                select: { id: true, skillDescription: true, canBeNotApplicable: true, order: true }
              }
            },
            orderBy: { skill: { order: 'asc' } }
          },
          emergencyResponses: {
            include: {
              question: {
                select: { id: true, question: true, modelAnswer: true, order: true }
              }
            },
            orderBy: { question: { order: 'asc' } }
          }
        },
        orderBy: { completedAt: 'desc' }
      });

      const responseData = {
        carer,
        assessments: assessmentResponses
      };

      res.json({
        success: true,
        data: responseData
      });

    } catch (error) {
      next(error);
    }
  }

  // Get carers ready for assessment (100% completion on at least one task in a package)
  async getCarersReadyForAssessment(req: Request, res: Response, next: NextFunction) {
    try {
      // Simplified approach - get carers with 100% task completion and their competency ratings
      const carersWithProgress = await prisma.carer.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          taskProgress: {
            some: {
              completionPercentage: 100
            }
          }
        },
        include: {
          taskProgress: {
            where: {
              completionPercentage: 100
            },
            include: {
              task: {
                select: { id: true, name: true }
              },
              package: {
                select: { id: true, name: true, postcode: true }
              }
            }
          },
          competencyRatings: {
            select: { taskId: true }
          }
        },
        orderBy: { name: 'asc' }
      });

      // Filter to only include carers who have completed tasks without competency ratings
      const filteredCarers = carersWithProgress.filter(carer => {
        const ratedTaskIds = new Set(carer.competencyRatings.map(r => r.taskId));
        return carer.taskProgress.some(progress => 
          progress.completionPercentage === 100 && !ratedTaskIds.has(progress.taskId)
        );
      }).map(carer => {
        const ratedTaskIds = new Set(carer.competencyRatings.map(r => r.taskId));
        const readyTasks = carer.taskProgress.filter(progress => 
          progress.completionPercentage === 100 && !ratedTaskIds.has(progress.taskId)
        );

        return {
          id: carer.id,
          name: carer.name,
          email: carer.email,
          isActive: carer.isActive,
          readyTasks: readyTasks.map(progress => ({
            taskId: progress.taskId,
            taskName: progress.task.name,
            packageId: progress.packageId,
            packageName: progress.package.name,
            packagePostcode: progress.package.postcode,
            completedAt: progress.lastUpdated
          }))
        };
      });

      res.json({
        success: true,
        data: filteredCarers,
        count: filteredCarers.length
      });
    } catch (error) {
      console.error('Error in getCarersReadyForAssessment:', error);
      next(error);
    }
  }

  // SMART ASSIGNMENT FEATURES: Sync progress globally across all packages
  private syncGlobalProgress = async (carerId: string, taskId: string, newCompletionCount: number, taskTargetCount: number): Promise<void> => {
    // Find all packages where this carer is assigned to this task
    const carerAssignments = await prisma.carerPackageAssignment.findMany({
      where: {
        carerId,
        isActive: true,
        package: {
          deletedAt: null,
          taskAssignments: {
            some: {
              taskId,
              isActive: true
            }
          }
        }
      },
      include: {
        package: {
          select: { id: true, name: true }
        }
      }
    });

    // Update progress for all packages where this carer-task combination exists
    const newCompletionPercentage = Math.min(100, Math.round((newCompletionCount / taskTargetCount) * 100));
    
    for (const assignment of carerAssignments) {
      await prisma.taskProgress.upsert({
        where: {
          carerId_packageId_taskId: {
            carerId,
            packageId: assignment.packageId,
            taskId
          }
        },
        update: {
          completionCount: newCompletionCount,
          completionPercentage: newCompletionPercentage,
          lastUpdated: new Date()
        },
        create: {
          carerId,
          packageId: assignment.packageId,
          taskId,
          completionCount: newCompletionCount,
          completionPercentage: newCompletionPercentage,
          lastUpdated: new Date()
        }
      });
    }
  }

  // CONFIRMATION MANAGEMENT: Get pending competency confirmations
  async getPendingConfirmations(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.query;

      const whereClause: any = {
        confirmedAt: null,
        expiresAt: {
          gte: new Date()
        }
      };

      if (carerId) {
        whereClause.carerId = carerId;
      }

      const pendingConfirmations = await prisma.competencyConfirmation.findMany({
        where: whereClause,
        include: {
          carer: {
            select: { id: true, name: true, email: true }
          },
          task: {
            select: { id: true, name: true }
          },
          setByAdmin: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      res.json({
        success: true,
        data: pendingConfirmations
      });
    } catch (error) {
      next(error);
    }
  }

  // CONFIRMATION MANAGEMENT: Confirm competency rating
  async confirmCompetencyRating(req: Request, res: Response, next: NextFunction) {
    try {
      const { confirmationId } = req.params;
      const { confirmed } = req.body;

      const confirmation = await prisma.competencyConfirmation.findUnique({
        where: { id: confirmationId },
        include: {
          carer: { select: { id: true, name: true } },
          task: { select: { id: true, name: true } }
        }
      });

      if (!confirmation) {
        return res.status(404).json({
          success: false,
          error: 'Confirmation not found'
        });
      }

      if (confirmation.confirmedAt) {
        return res.status(400).json({
          success: false,
          error: 'Confirmation already processed'
        });
      }

      if (new Date() > confirmation.expiresAt) {
        return res.status(400).json({
          success: false,
          error: 'Confirmation has expired'
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Update the confirmation
        const updatedConfirmation = await tx.competencyConfirmation.update({
          where: { id: confirmationId },
          data: {
            confirmedAt: new Date(),
            confirmed
          }
        });

        if (confirmed) {
          // Apply the competency rating
          await tx.competencyRating.upsert({
            where: {
              carerId_taskId: {
                carerId: confirmation.carerId,
                taskId: confirmation.taskId
              }
            },
            update: {
              level: confirmation.newLevel,
              source: confirmation.source,
              setByAdminId: confirmation.setByAdminId,
              setByAdminName: confirmation.setByAdminName,
              setAt: new Date(),
              notes: confirmation.notes
            },
            create: {
              carerId: confirmation.carerId,
              taskId: confirmation.taskId,
              level: confirmation.newLevel,
              source: confirmation.source,
              setByAdminId: confirmation.setByAdminId,
              setByAdminName: confirmation.setByAdminName,
              setAt: new Date(),
              notes: confirmation.notes
            }
          });
        }

        return updatedConfirmation;
      });

      // Log the confirmation
      await auditService.log({
        action: confirmed ? 'CONFIRM_COMPETENCY_RATING' : 'REJECT_COMPETENCY_RATING',
        entityType: 'CompetencyConfirmation',
        entityId: confirmationId,
        newValues: { confirmed },
        performedByAdminId: 'carer',
        performedByAdminName: confirmation.carer.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: result,
        message: confirmed 
          ? `Competency rating confirmed for ${confirmation.task.name}` 
          : `Competency rating rejected for ${confirmation.task.name}`
      });
    } catch (error) {
      next(error);
    }
  }

  // ASSESSMENT WORKFLOW: Get available assessments for carer
  async getAvailableAssessments(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.params;

      // Get carer's current progress
      const carerProgress = await prisma.taskProgress.findMany({
        where: {
          carerId,
          completionPercentage: 100
        },
        include: {
          task: {
            select: { id: true, name: true }
          }
        }
      });

      // Get all assessments and check which ones are available
      const assessments = await prisma.assessment.findMany({
        where: {
          isActive: true,
          deletedAt: null
        },
        include: {
          tasksCovered: {
            include: {
              task: {
                select: { id: true, name: true }
              }
            }
          },
          knowledgeQuestions: { orderBy: { order: 'asc' } },
          practicalSkills: { orderBy: { order: 'asc' } },
          emergencyQuestions: { orderBy: { order: 'asc' } }
        }
      });

      // Get existing competency ratings to filter out already assessed tasks
      const existingRatings = await prisma.competencyRating.findMany({
        where: { carerId },
        select: { taskId: true }
      });
      const ratedTaskIds = new Set(existingRatings.map(r => r.taskId));

      // Filter assessments where ALL tasks are 100% complete and not yet rated
      const availableAssessments = assessments.filter(assessment => {
        const taskIds = assessment.tasksCovered.map(tc => tc.taskId);
        const completedTaskIds = new Set(carerProgress.map(cp => cp.taskId));
        
        // Check if ALL tasks in this assessment are 100% complete
        const allTasksComplete = taskIds.every(taskId => completedTaskIds.has(taskId));
        
        // Check if ANY task in this assessment is not yet rated
        const hasUnratedTasks = taskIds.some(taskId => !ratedTaskIds.has(taskId));
        
        return allTasksComplete && hasUnratedTasks && taskIds.length > 0;
      });

      res.json({
        success: true,
        data: availableAssessments
      });
    } catch (error) {
      next(error);
    }
  }
}

export const progressController = new ProgressController();