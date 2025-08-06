import { Request, Response, NextFunction } from 'express';
import { prisma } from '../index';
import { auditService } from '../services/auditService';

interface CarerProgressSummary {
  id: string;
  name: string;
  email: string;
  phone: string;
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
  // Get all carers with progress summaries
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

      // Simple query - just get carers first
      const carers = await prisma.carer.findMany({
        where: whereClause,
        orderBy: { name: 'asc' }
      });

      const progressSummaries: CarerProgressSummary[] = await Promise.all(
        carers.map(async (carer) => {
          // Get package count
          const packageCount = await prisma.carerPackageAssignment.count({
            where: { carerId: carer.id, isActive: true }
          });
          
          // Get task progress
          const taskProgress = await prisma.taskProgress.findMany({
            where: { carerId: carer.id }
          });

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
            if (progress.completionPercentage >= 90) {
              const hasCompetency = await prisma.competencyRating.findFirst({
                where: { carerId: carer.id, taskId: progress.taskId }
              });
              if (!hasCompetency) {
                needsAssessment = true;
                break;
              }
            }
          }

          // Get last activity date
          const lastProgressUpdate = await prisma.taskProgress.findFirst({
            where: { carerId: carer.id },
            orderBy: { lastUpdated: 'desc' },
            select: { lastUpdated: true }
          });

          return {
            id: carer.id,
            name: carer.name,
            email: carer.email,
            phone: carer.phone,
            isActive: carer.isActive,
            packageCount,
            overallProgress: Math.round(overallProgress),
            needsAssessment,
            lastActivity: lastProgressUpdate?.lastUpdated
          };
        })
      );

      res.json({
        success: true,
        data: progressSummaries
      });
    } catch (error) {
      next(error);
    }
  }

  // Get detailed progress for a specific carer
  async getCarerDetailedProgress(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.params;

      // Simple query - just get the carer first
      const carer = await prisma.carer.findUnique({
        where: { id: carerId, deletedAt: null }
      });

      if (!carer) {
        return res.status(404).json({
          success: false,
          error: 'Carer not found'
        });
      }

      // Get package assignments
      const packageAssignments = await prisma.carerPackageAssignment.findMany({
        where: { carerId: carer.id, isActive: true },
        include: {
          package: {
            select: { id: true, name: true, postcode: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      // Get ALL task assignments for this carer's packages (this shows all assigned tasks)
      const packageTaskAssignments = await prisma.packageTaskAssignment.findMany({
        where: {
          packageId: { in: packageAssignments.map(pa => pa.packageId) },
          isActive: true
        },
        include: {
          task: {
            select: { id: true, name: true, targetCount: true }
          }
        },
        orderBy: { assignedAt: 'desc' }
      });

      // Get actual task progress data (this may be empty for some tasks)
      const taskProgressData = await prisma.taskProgress.findMany({
        where: { carerId: carer.id }
      });

      // Get competency ratings
      const competencyRatings = await prisma.competencyRating.findMany({
        where: { carerId: carer.id },
        include: {
          task: {
            select: { id: true, name: true }
          }
        },
        orderBy: { setAt: 'desc' }
      });

      // Get assessment information for tasks
      const assessmentTaskCoverage = await prisma.assessmentTaskCoverage.findMany({
        where: {
          taskId: { in: packageTaskAssignments.map(pta => pta.taskId) }
        },
        include: {
          assessment: {
            select: { id: true, name: true, isActive: true }
          }
        }
      });

      // Group task progress by package
      const packageProgressMap = new Map<string, CarerPackageProgress>();
      
      // Initialize packages
      for (const assignment of packageAssignments) {
        packageProgressMap.set(assignment.package.id, {
          packageId: assignment.package.id,
          packageName: assignment.package.name,
          packagePostcode: assignment.package.postcode,
          assignedAt: assignment.assignedAt,
          tasks: [],
          averageProgress: 0,
          competencyRatings: []
        });
      }

      // Process ALL assigned tasks (not just those with progress)
      for (const taskAssignment of packageTaskAssignments) {
        const packageProgress = packageProgressMap.get(taskAssignment.packageId);
        if (packageProgress) {
          // Find actual progress data for this task (may not exist)
          const progressData = taskProgressData.find(tp => 
            tp.packageId === taskAssignment.packageId && tp.taskId === taskAssignment.taskId
          );
          
          // Find competency rating for this task
          const competency = competencyRatings.find(c => c.taskId === taskAssignment.taskId);
          
          // Find assessment information for this task
          const taskAssessment = assessmentTaskCoverage.find(atc => atc.taskId === taskAssignment.taskId);
          const assessment = taskAssessment?.assessment;
          
          // Use actual progress data or defaults for unstarted tasks
          const completionCount = progressData?.completionCount || 0;
          const completionPercentage = progressData?.completionPercentage || 0;
          const lastUpdated = progressData?.lastUpdated || taskAssignment.assignedAt;
          
          // Check if can take assessment (when task is complete and part of an active assessment)
          const canTakeAssessment = completionPercentage >= 100 && !competency && Boolean(assessment?.isActive);

          const taskDetail: TaskProgressDetail = {
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

          packageProgress.tasks.push(taskDetail);
        }
      }

      // Calculate average progress for each package
      const packageProgress: CarerPackageProgress[] = Array.from(packageProgressMap.values()).map(pkg => {
        const averageProgress = pkg.tasks.length > 0 
          ? pkg.tasks.reduce((sum, task) => sum + task.completionPercentage, 0) / pkg.tasks.length
          : 0;
        
        return {
          ...pkg,
          averageProgress: Math.round(averageProgress)
        };
      });

      // Build competency ratings summary
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
        carer: {
          id: carer.id,
          name: carer.name,
          email: carer.email,
          phone: carer.phone,
          isActive: carer.isActive
        },
        packages: packageProgress,
        competencyRatings: competencyRatingsSummary
      };

      res.json({
        success: true,
        data: detailedProgress
      });
    } catch (error) {
      next(error);
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

  // Set manual competency rating
  async setManualCompetency(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId, taskId, level, notes } = req.body;

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

      // If setting to NOT_ASSESSED, also reset task progress
      if (level === 'NOT_ASSESSED') {
        await prisma.$transaction(async (tx) => {
          // Delete competency rating
          await tx.competencyRating.deleteMany({
            where: { carerId, taskId }
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
          oldValues: { level: 'EXISTING' },
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

      // Update or create competency rating
      const competency = await prisma.competencyRating.upsert({
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
        entityId: competency.id,
        newValues: { level, source: 'MANUAL', notes },
        performedByAdminId: req.user?.id || 'system',
        performedByAdminName: req.user?.name || 'System',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.json({
        success: true,
        data: competency,
        message: 'Manual competency rating set successfully'
      });
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
}

export const progressController = new ProgressController();