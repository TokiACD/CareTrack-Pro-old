import { Request, Response } from 'express'
import { prisma } from '../index'
import { asyncHandler, createError } from '../middleware/errorHandler'
import { auditService } from '../services/auditService'
import { CompetencyLevel, PracticalRating } from '@prisma/client'

export class AssessmentController {
  // Get all assessments with their sections
  listAssessments = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { includeDeleted = false, includeResponses = false } = req.query

    const assessments = await prisma.assessment.findMany({
      where: includeDeleted === 'true' ? {} : { deletedAt: null },
      include: {
        knowledgeQuestions: {
          orderBy: { order: 'asc' }
        },
        practicalSkills: {
          orderBy: { order: 'asc' }
        },
        emergencyQuestions: {
          orderBy: { order: 'asc' }
        },
        tasksCovered: {
          where: {
            task: {
              deletedAt: null
            }
          },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                targetCount: true
              }
            }
          }
        },
        ...(includeResponses === 'true' && {
          assessmentResponses: {
            include: {
              carer: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              assessor: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        })
      },
      orderBy: { createdAt: 'desc' }
    })

    res.json({
      success: true,
      data: assessments
    })
  })

  // Get single assessment by ID
  getAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params

    const assessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        knowledgeQuestions: {
          orderBy: { order: 'asc' }
        },
        practicalSkills: {
          orderBy: { order: 'asc' }
        },
        emergencyQuestions: {
          orderBy: { order: 'asc' }
        },
        tasksCovered: {
          where: {
            task: {
              deletedAt: null
            }
          },
          include: {
            task: {
              select: {
                id: true,
                name: true,
                targetCount: true
              }
            }
          }
        },
        assessmentResponses: {
          include: {
            carer: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            assessor: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    })

    if (!assessment) {
      throw createError(404, 'Assessment not found')
    }

    res.json({
      success: true,
      data: assessment
    })
  })

  // Create new assessment
  createAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const {
      name,
      knowledgeQuestions,
      practicalSkills,
      emergencyQuestions,
      tasksCovered
    } = req.body
    const admin = req.user!

    // Validate required fields
    if (!name?.trim()) {
      throw createError(400, 'Assessment name is required')
    }

    // Validate that at least one section has content
    const hasKnowledge = knowledgeQuestions && Array.isArray(knowledgeQuestions) && knowledgeQuestions.length > 0;
    const hasPractical = practicalSkills && Array.isArray(practicalSkills) && practicalSkills.length > 0;
    const hasEmergency = emergencyQuestions && Array.isArray(emergencyQuestions) && emergencyQuestions.length > 0;
    
    if (!hasKnowledge && !hasPractical && !hasEmergency) {
      throw createError(400, 'Assessment must contain at least one question or skill section')
    }

    // Validate knowledge questions format
    if (hasKnowledge) {
      for (const [index, question] of knowledgeQuestions.entries()) {
        if (!question.question?.trim()) {
          throw createError(400, `Knowledge question ${index + 1} is missing question text`)
        }
        if (!question.modelAnswer?.trim()) {
          throw createError(400, `Knowledge question ${index + 1} is missing model answer`)
        }
      }
    }

    // Validate practical skills format
    if (hasPractical) {
      for (const [index, skill] of practicalSkills.entries()) {
        if (!skill.skillDescription?.trim()) {
          throw createError(400, `Practical skill ${index + 1} is missing description`)
        }
      }
    }

    // Validate emergency questions format
    if (hasEmergency) {
      for (const [index, question] of emergencyQuestions.entries()) {
        if (!question.question?.trim()) {
          throw createError(400, `Emergency question ${index + 1} is missing question text`)
        }
        if (!question.modelAnswer?.trim()) {
          throw createError(400, `Emergency question ${index + 1} is missing model answer`)
        }
      }
    }

    // Validate task coverage if provided
    if (tasksCovered && Array.isArray(tasksCovered) && tasksCovered.length > 0) {
      // Verify all provided task IDs exist
      const existingTasks = await prisma.task.findMany({
        where: {
          id: { in: tasksCovered },
          deletedAt: null
        },
        select: { id: true }
      });

      const existingTaskIds = existingTasks.map(t => t.id);
      const invalidTaskIds = tasksCovered.filter(id => !existingTaskIds.includes(id));
      
      if (invalidTaskIds.length > 0) {
        throw createError(400, `Invalid task IDs: ${invalidTaskIds.join(', ')}`)
      }
    }

    // Create assessment with all sections in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.assessment.create({
        data: {
          name: name.trim()
        }
      })

      // Create knowledge questions if provided
      if (knowledgeQuestions && knowledgeQuestions.length > 0) {
        await tx.knowledgeQuestion.createMany({
          data: knowledgeQuestions.map((q: any, index: number) => ({
            assessmentId: newAssessment.id,
            question: q.question,
            modelAnswer: q.modelAnswer,
            order: q.order || index + 1
          }))
        })
      }

      // Create practical skills if provided
      if (practicalSkills && practicalSkills.length > 0) {
        await tx.practicalSkill.createMany({
          data: practicalSkills.map((s: any, index: number) => ({
            assessmentId: newAssessment.id,
            skillDescription: s.skillDescription,
            canBeNotApplicable: s.canBeNotApplicable || false,
            order: s.order || index + 1
          }))
        })
      }

      // Create emergency questions if provided
      if (emergencyQuestions && emergencyQuestions.length > 0) {
        await tx.emergencyQuestion.createMany({
          data: emergencyQuestions.map((q: any, index: number) => ({
            assessmentId: newAssessment.id,
            question: q.question,
            modelAnswer: q.modelAnswer,
            order: q.order || index + 1
          }))
        })
      }

      // Create task coverage if provided
      if (tasksCovered && tasksCovered.length > 0) {
        await tx.assessmentTaskCoverage.createMany({
          data: tasksCovered.map((taskId: string) => ({
            assessmentId: newAssessment.id,
            taskId
          }))
        })
      }

      return newAssessment
    })

    // Log the creation
    await auditService.log({
      action: 'CREATE_ASSESSMENT',
      entityType: 'Assessment',
      entityId: assessment.id,
      newValues: { name },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Fetch the complete assessment with relations
    const completeAssessment = await prisma.assessment.findUnique({
      where: { id: assessment.id },
      include: {
        knowledgeQuestions: { orderBy: { order: 'asc' } },
        practicalSkills: { orderBy: { order: 'asc' } },
        emergencyQuestions: { orderBy: { order: 'asc' } },
        tasksCovered: {
          include: {
            task: {
              select: { id: true, name: true, targetCount: true }
            }
          }
        }
      }
    })

    res.status(201).json({
      success: true,
      data: completeAssessment,
      message: 'Assessment created successfully'
    })
  })

  // Update assessment
  updateAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const {
      name,
      isActive,
      knowledgeQuestions,
      practicalSkills,
      emergencyQuestions,
      tasksCovered
    } = req.body
    const admin = req.user!

    // Check if assessment exists
    const existingAssessment = await prisma.assessment.findUnique({
      where: { id, deletedAt: null }
    })

    if (!existingAssessment) {
      throw createError(404, 'Assessment not found')
    }

    // Update assessment and sections in a transaction
    const updatedAssessment = await prisma.$transaction(async (tx) => {
      // Update the assessment
      const assessment = await tx.assessment.update({
        where: { id },
        data: {
          ...(name && { name: name.trim() }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date()
        }
      })

      // Update knowledge questions if provided
      if (knowledgeQuestions) {
        // Delete existing questions
        await tx.knowledgeQuestion.deleteMany({
          where: { assessmentId: id }
        })
        
        // Create new questions
        if (knowledgeQuestions.length > 0) {
          await tx.knowledgeQuestion.createMany({
            data: knowledgeQuestions.map((q: any, index: number) => ({
              assessmentId: id,
              question: q.question,
              modelAnswer: q.modelAnswer,
              order: q.order || index + 1
            }))
          })
        }
      }

      // Update practical skills if provided
      if (practicalSkills) {
        await tx.practicalSkill.deleteMany({
          where: { assessmentId: id }
        })
        
        if (practicalSkills.length > 0) {
          await tx.practicalSkill.createMany({
            data: practicalSkills.map((s: any, index: number) => ({
              assessmentId: id,
              skillDescription: s.skillDescription,
              canBeNotApplicable: s.canBeNotApplicable || false,
              order: s.order || index + 1
            }))
          })
        }
      }

      // Update emergency questions if provided
      if (emergencyQuestions) {
        await tx.emergencyQuestion.deleteMany({
          where: { assessmentId: id }
        })
        
        if (emergencyQuestions.length > 0) {
          await tx.emergencyQuestion.createMany({
            data: emergencyQuestions.map((q: any, index: number) => ({
              assessmentId: id,
              question: q.question,
              modelAnswer: q.modelAnswer,
              order: q.order || index + 1
            }))
          })
        }
      }

      // Update task coverage if provided
      if (tasksCovered) {
        await tx.assessmentTaskCoverage.deleteMany({
          where: { assessmentId: id }
        })
        
        if (tasksCovered.length > 0) {
          await tx.assessmentTaskCoverage.createMany({
            data: tasksCovered.map((taskId: string) => ({
              assessmentId: id,
              taskId
            }))
          })
        }
      }

      return assessment
    })

    // Log the update
    await auditService.log({
      action: 'UPDATE_ASSESSMENT',
      entityType: 'Assessment',
      entityId: id,
      oldValues: { name: existingAssessment.name },
      newValues: { name, isActive },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Fetch the complete updated assessment
    const completeAssessment = await prisma.assessment.findUnique({
      where: { id },
      include: {
        knowledgeQuestions: { orderBy: { order: 'asc' } },
        practicalSkills: { orderBy: { order: 'asc' } },
        emergencyQuestions: { orderBy: { order: 'asc' } },
        tasksCovered: {
          include: {
            task: {
              select: { id: true, name: true, targetCount: true }
            }
          }
        }
      }
    })

    res.json({
      success: true,
      data: completeAssessment,
      message: 'Assessment updated successfully'
    })
  })

  // Soft delete assessment
  deleteAssessment = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params
    const admin = req.user!

    const assessment = await prisma.assessment.findUnique({
      where: { id, deletedAt: null }
    })

    if (!assessment) {
      throw createError(404, 'Assessment not found')
    }

    // Check if assessment has responses
    const responseCount = await prisma.assessmentResponse.count({
      where: { assessmentId: id }
    })

    if (responseCount > 0) {
      // Soft delete to preserve assessment responses
      await prisma.assessment.update({
        where: { id },
        data: { 
          deletedAt: new Date(),
          isActive: false
        }
      })

      await auditService.log({
        action: 'SOFT_DELETE_ASSESSMENT',
        entityType: 'Assessment',
        entityId: id,
        oldValues: { isActive: true, deletedAt: null },
        newValues: { isActive: false, deletedAt: new Date() },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: `Assessment "${assessment.name}" deleted successfully. Assessment responses preserved.`
      })
    } else {
      // Hard delete if no responses exist
      await prisma.assessment.delete({
        where: { id }
      })

      await auditService.log({
        action: 'DELETE_ASSESSMENT',
        entityType: 'Assessment',
        entityId: id,
        oldValues: { name: assessment.name },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

      res.json({
        success: true,
        message: `Assessment "${assessment.name}" deleted successfully`
      })
    }
  })

  // Submit assessment response
  submitAssessmentResponse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id: assessmentId } = req.params
    const {
      carerId,
      assessorUniqueId,
      overallRating,
      knowledgeResponses,
      practicalResponses,
      emergencyResponses
    } = req.body
    const admin = req.user!

    // Validate assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, deletedAt: null, isActive: true }
    })

    if (!assessment) {
      throw createError(404, 'Assessment not found or inactive')
    }

    // Validate carer exists
    const carer = await prisma.carer.findUnique({
      where: { id: carerId, deletedAt: null, isActive: true }
    })

    if (!carer) {
      throw createError(404, 'Carer not found or inactive')
    }

    // Validate overall rating
    if (!Object.values(CompetencyLevel).includes(overallRating)) {
      throw createError(400, 'Invalid overall rating')
    }

    // Create assessment response in a transaction
    const response = await prisma.$transaction(async (tx) => {
      // Create the response
      const assessmentResponse = await tx.assessmentResponse.create({
        data: {
          assessmentId,
          carerId,
          assessorId: admin.id,
          assessorName: admin.name,
          assessorUniqueId: assessorUniqueId || admin.id,
          overallRating: overallRating as CompetencyLevel
        }
      })

      // Create knowledge responses
      if (knowledgeResponses && knowledgeResponses.length > 0) {
        await tx.knowledgeResponse.createMany({
          data: knowledgeResponses.map((kr: any) => ({
            responseId: assessmentResponse.id,
            questionId: kr.questionId,
            carerAnswer: kr.carerAnswer
          }))
        })
      }

      // Create practical responses
      if (practicalResponses && practicalResponses.length > 0) {
        await tx.practicalResponse.createMany({
          data: practicalResponses.map((pr: any) => ({
            responseId: assessmentResponse.id,
            skillId: pr.skillId,
            rating: pr.rating as PracticalRating
          }))
        })
      }

      // Create emergency responses
      if (emergencyResponses && emergencyResponses.length > 0) {
        await tx.emergencyResponse.createMany({
          data: emergencyResponses.map((er: any) => ({
            responseId: assessmentResponse.id,
            questionId: er.questionId,
            carerAnswer: er.carerAnswer
          }))
        })
      }

      // Create competency ratings for covered tasks
      const tasksCovered = await tx.assessmentTaskCoverage.findMany({
        where: { assessmentId }
      })

      if (tasksCovered.length > 0) {
        const competencyRatings = tasksCovered.map(coverage => ({
          carerId,
          taskId: coverage.taskId,
          level: overallRating as CompetencyLevel,
          source: 'ASSESSMENT' as const,
          assessmentResponseId: assessmentResponse.id,
          setByAdminId: admin.id,
          setByAdminName: admin.name,
          setAt: new Date()
        }))

        // Upsert competency ratings (update if exists, create if not)
        for (const rating of competencyRatings) {
          await tx.competencyRating.upsert({
            where: {
              carerId_taskId: {
                carerId: rating.carerId,
                taskId: rating.taskId
              }
            },
            update: {
              level: rating.level,
              source: rating.source,
              assessmentResponseId: rating.assessmentResponseId,
              setByAdminId: rating.setByAdminId,
              setByAdminName: rating.setByAdminName,
              setAt: rating.setAt
            },
            create: rating
          })
        }
      }

      return assessmentResponse
    })

    // Log the response submission
    await auditService.log({
      action: 'SUBMIT_ASSESSMENT_RESPONSE',
      entityType: 'AssessmentResponse',
      entityId: response.id,
      newValues: { 
        assessmentId, 
        carerId, 
        overallRating,
        assessorId: admin.id
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Fetch complete response with relations
    const completeResponse = await prisma.assessmentResponse.findUnique({
      where: { id: response.id },
      include: {
        assessment: {
          select: { id: true, name: true }
        },
        carer: {
          select: { id: true, name: true, email: true }
        },
        assessor: {
          select: { id: true, name: true }
        },
        knowledgeResponses: true,
        practicalResponses: true,
        emergencyResponses: true
      }
    })

    res.status(201).json({
      success: true,
      data: completeResponse,
      message: `Assessment completed for ${carer.name}`
    })
  })

  // Get assessment responses for a specific assessment
  getAssessmentResponses = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id: assessmentId } = req.params

    const responses = await prisma.assessmentResponse.findMany({
      where: { assessmentId },
      include: {
        carer: {
          select: { id: true, name: true, email: true }
        },
        assessor: {
          select: { id: true, name: true }
        },
        knowledgeResponses: {
          include: {
            question: {
              select: { question: true, modelAnswer: true }
            }
          }
        },
        practicalResponses: {
          include: {
            skill: {
              select: { skillDescription: true }
            }
          }
        },
        emergencyResponses: {
          include: {
            question: {
              select: { question: true, modelAnswer: true }
            }
          }
        }
      },
      orderBy: { completedAt: 'desc' }
    })

    res.json({
      success: true,
      data: responses
    })
  })

  // Get draft assessment response
  getDraftResponse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { assessmentId, carerId } = req.params

    // Validate assessment exists and is active
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, deletedAt: null, isActive: true }
    })

    if (!assessment) {
      throw createError(404, 'Assessment not found or inactive')
    }

    // Validate carer exists and is active
    const carer = await prisma.carer.findUnique({
      where: { id: carerId, deletedAt: null, isActive: true }
    })

    if (!carer) {
      throw createError(404, 'Carer not found or inactive')
    }

    // Get draft response
    const draft = await prisma.draftAssessmentResponse.findUnique({
      where: {
        assessmentId_carerId: {
          assessmentId,
          carerId
        }
      },
      include: {
        assessment: {
          select: { id: true, name: true }
        },
        carer: {
          select: { id: true, name: true }
        },
        createdByAdmin: {
          select: { id: true, name: true }
        }
      }
    })

    res.json({
      success: true,
      data: draft
    })
  })

  // Save or update draft assessment response
  saveDraftResponse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { assessmentId, carerId } = req.params
    const { draftData } = req.body
    const admin = req.user!

    // Validate assessment exists and is active
    const assessment = await prisma.assessment.findUnique({
      where: { id: assessmentId, deletedAt: null, isActive: true }
    })

    if (!assessment) {
      throw createError(404, 'Assessment not found or inactive')
    }

    // Validate carer exists and is active
    const carer = await prisma.carer.findUnique({
      where: { id: carerId, deletedAt: null, isActive: true }
    })

    if (!carer) {
      throw createError(404, 'Carer not found or inactive')
    }

    // Validate draft data structure
    if (!draftData || typeof draftData !== 'object') {
      throw createError(400, 'Draft data is required and must be an object')
    }

    // Upsert draft response
    const draft = await prisma.draftAssessmentResponse.upsert({
      where: {
        assessmentId_carerId: {
          assessmentId,
          carerId
        }
      },
      update: {
        draftData,
        syncedToServer: true
      },
      create: {
        assessmentId,
        carerId,
        createdByAdminId: admin.id,
        draftData,
        syncedToServer: true
      },
      include: {
        assessment: {
          select: { id: true, name: true }
        },
        carer: {
          select: { id: true, name: true }
        }
      }
    })

    res.json({
      success: true,
      data: draft,
      message: 'Draft saved successfully'
    })
  })

  // Delete draft assessment response
  deleteDraftResponse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { assessmentId, carerId } = req.params

    // Check if draft exists
    const existingDraft = await prisma.draftAssessmentResponse.findUnique({
      where: {
        assessmentId_carerId: {
          assessmentId,
          carerId
        }
      }
    })

    if (!existingDraft) {
      throw createError(404, 'Draft not found')
    }

    // Delete draft
    await prisma.draftAssessmentResponse.delete({
      where: {
        assessmentId_carerId: {
          assessmentId,
          carerId
        }
      }
    })

    res.json({
      success: true,
      message: 'Draft deleted successfully'
    })
  })

  // Get individual assessment response by ID
  getAssessmentResponseById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { responseId } = req.params

    const response = await prisma.assessmentResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: {
          include: {
            knowledgeQuestions: { orderBy: { order: 'asc' } },
            practicalSkills: { orderBy: { order: 'asc' } },
            emergencyQuestions: { orderBy: { order: 'asc' } },
            tasksCovered: {
              include: {
                task: {
                  select: { id: true, name: true, targetCount: true }
                }
              }
            }
          }
        },
        carer: {
          select: { id: true, name: true, email: true }
        },
        assessor: {
          select: { id: true, name: true }
        },
        knowledgeResponses: {
          include: {
            question: {
              select: { id: true, question: true, modelAnswer: true, order: true }
            }
          }
        },
        practicalResponses: {
          include: {
            skill: {
              select: { id: true, skillDescription: true, canBeNotApplicable: true, order: true }
            }
          }
        },
        emergencyResponses: {
          include: {
            question: {
              select: { id: true, question: true, modelAnswer: true, order: true }
            }
          }
        }
      }
    })

    if (!response) {
      throw createError(404, 'Assessment response not found')
    }

    res.json({
      success: true,
      data: response
    })
  })

  // Update existing assessment response
  updateAssessmentResponse = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { responseId } = req.params
    const {
      assessorUniqueId,
      overallRating,
      knowledgeResponses,
      practicalResponses,
      emergencyResponses
    } = req.body
    const admin = req.user!

    // Check if response exists
    const existingResponse = await prisma.assessmentResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: {
          include: {
            tasksCovered: true
          }
        },
        carer: true
      }
    })

    if (!existingResponse) {
      throw createError(404, 'Assessment response not found')
    }

    // Validate overall rating if provided
    if (overallRating && !Object.values(CompetencyLevel).includes(overallRating)) {
      throw createError(400, 'Invalid overall rating')
    }

    // Update response in a transaction
    const updatedResponse = await prisma.$transaction(async (tx) => {
      // Update the main response
      const response = await tx.assessmentResponse.update({
        where: { id: responseId },
        data: {
          ...(assessorUniqueId !== undefined && { assessorUniqueId }),
          ...(overallRating && { overallRating: overallRating as CompetencyLevel }),
          assessorId: admin.id,
          assessorName: admin.name
        }
      })

      // Update knowledge responses if provided
      if (knowledgeResponses && Array.isArray(knowledgeResponses)) {
        await tx.knowledgeResponse.deleteMany({
          where: { responseId }
        })
        
        if (knowledgeResponses.length > 0) {
          await tx.knowledgeResponse.createMany({
            data: knowledgeResponses.map((kr: any) => ({
              responseId,
              questionId: kr.questionId,
              carerAnswer: kr.carerAnswer
            }))
          })
        }
      }

      // Update practical responses if provided
      if (practicalResponses && Array.isArray(practicalResponses)) {
        await tx.practicalResponse.deleteMany({
          where: { responseId }
        })
        
        if (practicalResponses.length > 0) {
          await tx.practicalResponse.createMany({
            data: practicalResponses.map((pr: any) => ({
              responseId,
              skillId: pr.skillId,
              rating: pr.rating as PracticalRating
            }))
          })
        }
      }

      // Update emergency responses if provided
      if (emergencyResponses && Array.isArray(emergencyResponses)) {
        await tx.emergencyResponse.deleteMany({
          where: { responseId }
        })
        
        if (emergencyResponses.length > 0) {
          await tx.emergencyResponse.createMany({
            data: emergencyResponses.map((er: any) => ({
              responseId,
              questionId: er.questionId,
              carerAnswer: er.carerAnswer
            }))
          })
        }
      }

      // Update competency ratings if overall rating changed
      if (overallRating && existingResponse.assessment.tasksCovered.length > 0) {
        for (const taskCoverage of existingResponse.assessment.tasksCovered) {
          await tx.competencyRating.upsert({
            where: {
              carerId_taskId: {
                carerId: existingResponse.carerId,
                taskId: taskCoverage.taskId
              }
            },
            update: {
              level: overallRating as CompetencyLevel,
              source: 'ASSESSMENT' as const,
              assessmentResponseId: responseId,
              setByAdminId: admin.id,
              setByAdminName: admin.name,
              setAt: new Date()
            },
            create: {
              carerId: existingResponse.carerId,
              taskId: taskCoverage.taskId,
              level: overallRating as CompetencyLevel,
              source: 'ASSESSMENT' as const,
              assessmentResponseId: responseId,
              setByAdminId: admin.id,
              setByAdminName: admin.name,
              setAt: new Date()
            }
          })
        }
      }

      return response
    })

    // Log the update
    await auditService.log({
      action: 'UPDATE_ASSESSMENT_RESPONSE',
      entityType: 'AssessmentResponse',
      entityId: responseId,
      oldValues: {
        overallRating: existingResponse.overallRating,
        assessorId: existingResponse.assessorId
      },
      newValues: {
        overallRating: overallRating || existingResponse.overallRating,
        assessorId: admin.id
      },
      performedByAdminId: admin.id,
      performedByAdminName: admin.name,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    })

    // Fetch complete updated response
    const completeResponse = await prisma.assessmentResponse.findUnique({
      where: { id: responseId },
      include: {
        assessment: {
          select: { id: true, name: true }
        },
        carer: {
          select: { id: true, name: true, email: true }
        },
        assessor: {
          select: { id: true, name: true }
        },
        knowledgeResponses: true,
        practicalResponses: true,
        emergencyResponses: true
      }
    })

    res.json({
      success: true,
      data: completeResponse,
      message: `Assessment response updated for ${existingResponse.carer.name}`
    })
  })
}