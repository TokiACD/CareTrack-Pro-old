import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import { assessmentTriggerService } from '../services/AssessmentTriggerService'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()

// All routes require authentication
router.use(requireAuth)

/**
 * GET /api/assessment-triggers/ready-carers
 * Get all carers currently ready for assessment
 */
router.get('/ready-carers', asyncHandler(async (req, res) => {
  const triggerEvents = await assessmentTriggerService.getCarersReadyForAssessment()
  
  res.json({
    success: true,
    data: triggerEvents,
    count: triggerEvents.length,
    message: `Found ${triggerEvents.length} carers ready for assessment`
  })
}))

/**
 * POST /api/assessment-triggers/check/:carerId
 * Manually check assessment triggers for a specific carer
 */
router.post('/check/:carerId', asyncHandler(async (req, res) => {
  const { carerId } = req.params
  const { taskId, completionPercentage } = req.body

  if (!taskId || completionPercentage === undefined) {
    return res.status(400).json({
      success: false,
      error: 'taskId and completionPercentage are required'
    })
  }

  const triggerEvent = await assessmentTriggerService.checkAssessmentTriggers(
    carerId, 
    taskId, 
    completionPercentage
  )

  let notifications = []
  if (triggerEvent) {
    notifications = await assessmentTriggerService.generateAssessmentNotifications(triggerEvent)
  }

  res.json({
    success: true,
    data: {
      triggerEvent,
      notifications
    },
    message: triggerEvent 
      ? `Found ${triggerEvent.availableAssessments.length} available assessments` 
      : 'No assessment triggers detected'
  })
}))

/**
 * POST /api/assessment-triggers/auto-assign
 * Auto-assign assessments for ready carers
 */
router.post('/auto-assign', asyncHandler(async (req, res) => {
  const { carerId, assessmentIds } = req.body
  const adminId = req.user?.id

  if (!adminId) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required'
    })
  }

  if (!carerId) {
    return res.status(400).json({
      success: false,
      error: 'carerId is required'
    })
  }

  // Get current trigger events for this carer
  const triggerEvents = await assessmentTriggerService.getCarersReadyForAssessment()
  const carerTriggerEvents = triggerEvents.filter(event => event.carerId === carerId)

  if (carerTriggerEvents.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No assessment triggers found for this carer'
    })
  }

  const assignedAssessments = []
  
  // Process each trigger event
  for (const triggerEvent of carerTriggerEvents) {
    // Filter assessments if specific assessmentIds are provided
    let assessmentsToAssign = triggerEvent.availableAssessments
    if (assessmentIds && Array.isArray(assessmentIds)) {
      assessmentsToAssign = assessmentsToAssign.filter(a => assessmentIds.includes(a.assessmentId))
    }

    // Only assign fully ready assessments
    assessmentsToAssign = assessmentsToAssign.filter(a => a.isFullyReady)

    if (assessmentsToAssign.length > 0) {
      // Create a modified trigger event with only the selected assessments
      const modifiedTriggerEvent = {
        ...triggerEvent,
        availableAssessments: assessmentsToAssign
      }
      
      const assigned = await assessmentTriggerService.autoAssignAssessments(modifiedTriggerEvent, adminId)
      assignedAssessments.push(...assigned)
    }
  }

  res.json({
    success: true,
    data: {
      assignedAssessmentIds: assignedAssessments,
      count: assignedAssessments.length
    },
    message: `Successfully auto-assigned ${assignedAssessments.length} assessments`
  })
}))

/**
 * GET /api/assessment-triggers/summary
 * Get summary of assessment readiness across all carers
 */
router.get('/summary', asyncHandler(async (req, res) => {
  const triggerEvents = await assessmentTriggerService.getCarersReadyForAssessment()
  
  // Aggregate statistics
  const summary = {
    totalCarersReady: new Set(triggerEvents.map(e => e.carerId)).size,
    totalAssessmentOpportunities: triggerEvents.reduce((sum, e) => sum + e.availableAssessments.length, 0),
    fullyReadyAssessments: triggerEvents.reduce((sum, e) => sum + e.availableAssessments.filter(a => a.isFullyReady).length, 0),
    partiallyReadyAssessments: triggerEvents.reduce((sum, e) => sum + e.availableAssessments.filter(a => !a.isFullyReady).length, 0),
    carersReadyCount: triggerEvents.length,
    assessmentBreakdown: {} as Record<string, number>
  }

  // Count assessments by name
  for (const event of triggerEvents) {
    for (const assessment of event.availableAssessments) {
      if (assessment.isFullyReady) {
        summary.assessmentBreakdown[assessment.assessmentName] = 
          (summary.assessmentBreakdown[assessment.assessmentName] || 0) + 1
      }
    }
  }

  res.json({
    success: true,
    data: summary,
    message: `Assessment readiness summary: ${summary.totalCarersReady} carers ready`
  })
}))

/**
 * GET /api/assessment-triggers/notifications
 * Get current assessment notifications
 */
router.get('/notifications', asyncHandler(async (req, res) => {
  const { severity, limit = 50 } = req.query
  
  const triggerEvents = await assessmentTriggerService.getCarersReadyForAssessment()
  
  const allNotifications = []
  for (const event of triggerEvents) {
    const notifications = await assessmentTriggerService.generateAssessmentNotifications(event)
    allNotifications.push(...notifications)
  }

  // Filter by severity if provided
  let filteredNotifications = allNotifications
  if (severity && typeof severity === 'string') {
    filteredNotifications = allNotifications.filter(n => n.severity === severity)
  }

  // Sort by severity (high -> medium -> low) and then by date
  filteredNotifications.sort((a, b) => {
    const severityOrder = { high: 3, medium: 2, low: 1 }
    const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
    if (severityDiff !== 0) return severityDiff
    return b.createdAt.getTime() - a.createdAt.getTime()
  })

  // Apply limit
  const limitedNotifications = filteredNotifications.slice(0, Number(limit))

  res.json({
    success: true,
    data: limitedNotifications,
    count: limitedNotifications.length,
    total: filteredNotifications.length,
    message: `Retrieved ${limitedNotifications.length} assessment notifications`
  })
}))

/**
 * POST /api/assessment-triggers/send-daily-summary
 * Manually trigger daily assessment summary email
 */
router.post('/send-daily-summary', asyncHandler(async (req, res) => {
  const adminId = req.user?.id

  if (!adminId) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required'
    })
  }

  const success = await assessmentTriggerService.sendDailyAssessmentSummary()

  res.json({
    success: true,
    data: { emailSent: success },
    message: success 
      ? 'Daily assessment summary sent successfully'
      : 'No carers ready for assessment or email failed'
  })
}))

/**
 * POST /api/assessment-triggers/send-notifications/:carerId
 * Manually trigger assessment notifications for a specific carer
 */
router.post('/send-notifications/:carerId', asyncHandler(async (req, res) => {
  const { carerId } = req.params
  const adminId = req.user?.id

  if (!adminId) {
    return res.status(401).json({
      success: false,
      error: 'Admin authentication required'
    })
  }

  // Get current trigger events for this carer
  const triggerEvents = await assessmentTriggerService.getCarersReadyForAssessment()
  const carerTriggerEvents = triggerEvents.filter(event => event.carerId === carerId)

  if (carerTriggerEvents.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'No assessment triggers found for this carer'
    })
  }

  let emailsSent = 0
  for (const triggerEvent of carerTriggerEvents) {
    try {
      const success = await assessmentTriggerService.sendAssessmentNotificationEmails(triggerEvent)
      if (success) emailsSent++
    } catch (error) {
      console.error('Error sending notification emails for trigger event:', error)
    }
  }

  res.json({
    success: true,
    data: { 
      triggerEvents: carerTriggerEvents.length,
      emailsSent 
    },
    message: `Sent notification emails for ${emailsSent} assessment triggers`
  })
}))

export { router as assessmentTriggerRoutes }