import { Router } from 'express'
import { param } from 'express-validator'
import { requireAuth } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { progressController } from '../controllers/ProgressController'
import { pdfService } from '../services/pdfService'
import { auditService } from '../services/auditService'
import { asyncHandler } from '../middleware/errorHandler'

const router = Router()
router.use(requireAuth)

// Get all carers with progress summaries
router.get('/', progressController.getCarerProgressSummaries.bind(progressController))

// Get carers ready for assessment
router.get('/ready-for-assessment', progressController.getCarersReadyForAssessment.bind(progressController))

// Get detailed progress for a specific carer
router.get('/carer/:carerId', progressController.getCarerDetailedProgress.bind(progressController))

// Get assessment responses for a specific carer  
router.get('/carer/:carerId/assessments', 
  [
    param('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  progressController.getCarerAssessmentResponses.bind(progressController)
)

// Update task progress for a carer
router.put('/update', progressController.updateTaskProgress.bind(progressController))

// Reset task progress for a carer
router.put('/reset', progressController.resetTaskProgress.bind(progressController))

// Set manual competency rating
router.put('/competency', progressController.setManualCompetency.bind(progressController))

// CONFIRMATION MANAGEMENT ROUTES
// Get pending confirmations
router.get('/confirmations', progressController.getPendingConfirmations.bind(progressController))

// Confirm competency rating
router.put('/confirmations/:confirmationId', progressController.confirmCompetencyRating.bind(progressController))

// ASSESSMENT WORKFLOW ROUTES
// Get available assessments for carer
router.get('/carer/:carerId/available-assessments', progressController.getAvailableAssessments.bind(progressController))

// Generate and download PDF report for a carer
router.get('/:carerId/pdf', 
  [
    param('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { carerId } = req.params
    const admin = req.user!

    try {
      // Generate and stream PDF
      await pdfService.streamCarerPDF(carerId, res)

      // Log PDF generation for audit trail
      await auditService.log({
        action: 'GENERATE_CARER_PDF',
        entityType: 'Carer',
        entityId: carerId,
        newValues: { 
          generatedBy: admin.name,
          generationDate: new Date().toISOString(),
          reason: 'PDF download request'
        },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })

    } catch (error) {
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : 'PDF generation failed' 
      })
    }
  })
)

// ORGANIZATIONAL REPORTS: Generate comprehensive reports
router.post('/reports/organizational',
  asyncHandler(async (req, res) => {
    const { reportType, dateRange, carePackageIds } = req.body
    const admin = req.user!
    
    if (!reportType || !['competency-matrix', 'training-needs', 'compliance-audit', 'performance-trends'].includes(reportType)) {
      return res.status(400).json({ message: 'Valid report type is required' })
    }

    try {
      const reportData = await pdfService.generateOrganizationalReport({
        reportType,
        dateRange: dateRange ? {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        } : undefined,
        carePackageIds
      })
      
      await pdfService.streamOrganizationalPDF(reportData, res)

      // Log organizational report generation
      await auditService.log({
        action: 'GENERATE_ORGANIZATIONAL_REPORT',
        entityType: 'Organization',
        entityId: 'system',
        newValues: { 
          reportType,
          generatedBy: admin.name,
          generationDate: new Date().toISOString(),
          dateRange: dateRange || 'Last 30 days',
          carePackageIds: carePackageIds || 'All packages'
        },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })
    } catch (error: any) {
      res.status(500).json({
        message: 'Failed to generate organizational report',
        error: error.message
      })
    }
  })
)

// BULK PDF GENERATION: Generate multiple PDFs in ZIP
router.post('/reports/bulk',
  asyncHandler(async (req, res) => {
    const { 
      carerIds, 
      includeIndividualReports = true,
      includeOrganizationalReport = false,
      reportType,
      dateRange,
      filterCriteria 
    } = req.body
    const admin = req.user!
    
    if (!carerIds || !Array.isArray(carerIds) || carerIds.length === 0) {
      return res.status(400).json({ message: 'At least one carer ID is required' })
    }

    if (includeOrganizationalReport && !reportType) {
      return res.status(400).json({ message: 'Report type required for organizational reports' })
    }

    try {
      const options = {
        includeIndividualReports,
        includeOrganizationalReport,
        reportType,
        dateRange: dateRange ? {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        } : undefined,
        filterCriteria
      }
      
      await pdfService.streamBulkPDFs(carerIds, options, res)

      // Log bulk PDF generation
      await auditService.log({
        action: 'GENERATE_BULK_PDFS',
        entityType: 'Organization',
        entityId: 'system',
        newValues: { 
          carerCount: carerIds.length,
          includeIndividualReports,
          includeOrganizationalReport,
          reportType: reportType || 'None',
          generatedBy: admin.name,
          generationDate: new Date().toISOString()
        },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })
    } catch (error: any) {
      res.status(500).json({
        message: 'Failed to generate bulk PDFs',
        error: error.message
      })
    }
  })
)

// REPORT DATA: Get report data without PDF generation (for preview)
router.post('/reports/data',
  asyncHandler(async (req, res) => {
    const { reportType, dateRange, carePackageIds } = req.body
    
    if (!reportType || !['competency-matrix', 'training-needs', 'compliance-audit', 'performance-trends'].includes(reportType)) {
      return res.status(400).json({ message: 'Valid report type is required' })
    }

    try {
      const reportData = await pdfService.generateOrganizationalReport({
        reportType,
        dateRange: dateRange ? {
          startDate: new Date(dateRange.startDate),
          endDate: new Date(dateRange.endDate)
        } : undefined,
        carePackageIds
      })
      
      res.json({ success: true, data: reportData })
    } catch (error: any) {
      res.status(500).json({
        message: 'Failed to generate report data',
        error: error.message
      })
    }
  })
)

// COMPLIANCE TEMPLATES: Generate regulatory compliant PDFs
router.post('/reports/compliance/:carerId',
  [
    param('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { carerId } = req.params
    const { 
      templateType = 'CQC',
      enableGDPRMode = false,
      anonymizeData = false,
      includeRetentionPolicy = true,
      includeDataProcessingRecord = true,
      digitalSignature
    } = req.body
    const admin = req.user!

    const validTemplates = ['CQC', 'SKILLS_FOR_HEALTH', 'NICE', 'HSE']
    if (!validTemplates.includes(templateType)) {
      return res.status(400).json({ 
        message: 'Invalid template type', 
        validTypes: validTemplates 
      })
    }

    try {
      const complianceOptions = {
        enableGDPRMode,
        anonymizeData,
        includeRetentionPolicy,
        includeDataProcessingRecord,
        template: templateType === 'CQC' ? (pdfService as any).getCQCTemplate() :
                 templateType === 'SKILLS_FOR_HEALTH' ? (pdfService as any).getSkillsForHealthTemplate() :
                 templateType === 'NICE' ? (pdfService as any).getNICETemplate() :
                 (pdfService as any).getHSETemplate(),
        digitalSignature: digitalSignature ? {
          signerName: digitalSignature.signerName || admin.name,
          signerRole: digitalSignature.signerRole || 'System Administrator',
          organizationName: digitalSignature.organizationName || 'CareTrack Pro Organization'
        } : undefined
      }
      
      await pdfService.streamCompliancePDF(carerId, res, complianceOptions)

      // Log compliance PDF generation
      await auditService.log({
        action: 'GENERATE_COMPLIANCE_PDF',
        entityType: 'Carer',
        entityId: carerId,
        newValues: { 
          templateType,
          enableGDPRMode,
          anonymizeData,
          generatedBy: admin.name,
          generationDate: new Date().toISOString()
        },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })
    } catch (error: any) {
      res.status(500).json({
        message: 'Failed to generate compliance PDF',
        error: error.message
      })
    }
  })
)

// DOCUMENT VERSIONING: Create and track document versions
router.post('/documents/:carerId/versions',
  [
    param('carerId')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Carer ID is required')
  ],
  validateRequest,
  asyncHandler(async (req, res) => {
    const { carerId } = req.params
    const { changes, templateType } = req.body
    const admin = req.user!

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return res.status(400).json({ message: 'Changes array is required' })
    }

    try {
      const carerData = await pdfService.generateCarerPDF(carerId)
      
      const template = templateType === 'CQC' ? (pdfService as any).getCQCTemplate() :
                      templateType === 'SKILLS_FOR_HEALTH' ? (pdfService as any).getSkillsForHealthTemplate() :
                      templateType === 'NICE' ? (pdfService as any).getNICETemplate() :
                      templateType === 'HSE' ? (pdfService as any).getHSETemplate() :
                      undefined
      
      const version = await pdfService.createDocumentVersion(
        carerData,
        changes,
        admin.name,
        template
      )

      // Log document versioning
      await auditService.log({
        action: 'CREATE_DOCUMENT_VERSION',
        entityType: 'Carer',
        entityId: carerId,
        newValues: {
          versionId: version.id,
          version: version.version,
          changes: changes.join(', '),
          createdBy: admin.name
        },
        performedByAdminId: admin.id,
        performedByAdminName: admin.name,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      })
      
      res.json({ success: true, version })
    } catch (error: any) {
      res.status(500).json({
        message: 'Failed to create document version',
        error: error.message
      })
    }
  })
)

// Helper function for scheduling
function getNextRunDate(frequency: string): Date {
  const now = new Date()
  switch (frequency) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    case 'monthly':
      const nextMonth = new Date(now)
      nextMonth.setMonth(now.getMonth() + 1)
      return nextMonth
    case 'quarterly':
      const nextQuarter = new Date(now)
      nextQuarter.setMonth(now.getMonth() + 3)
      return nextQuarter
    default:
      return new Date(now.getTime() + 24 * 60 * 60 * 1000)
  }
}

export { router as progressRoutes }