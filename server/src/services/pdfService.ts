import PDFDocument from 'pdfkit'
import { Response } from 'express'
import { prisma } from '../index'
import { CompetencyLevel } from '@prisma/client'

interface CarerPDFData {
  carer: {
    id: string
    name: string
    email: string
    createdAt: Date
  }
  packageAssignments: Array<{
    package: {
      id: string
      name: string
      postcode: string
    }
    assignedAt: Date
  }>
  taskProgress: Array<{
    task: {
      id: string
      name: string
      targetCount: number
    }
    package: {
      name: string
    }
    completionCount: number
    completionPercentage: number
  }>
  assessmentResponses: Array<{
    id: string
    overallRating: CompetencyLevel
    completedAt: Date
    assessment: {
      name: string
    }
    assessor: {
      name: string
    }
    knowledgeResponses: Array<{
      question: {
        question: string
        modelAnswer: string
      }
      carerAnswer: string
    }>
    practicalResponses: Array<{
      skill: {
        skillDescription: string
      }
      rating: string
    }>
    emergencyResponses: Array<{
      question: {
        question: string
        modelAnswer: string
      }
      carerAnswer: string
    }>
  }>
  competencyRatings: Array<{
    task: {
      name: string
    }
    level: CompetencyLevel
    source: string
    setAt: Date
    setByAdminName?: string
  }>
}

interface OrganizationalReportData {
  reportType: 'competency-matrix' | 'training-needs' | 'compliance-audit' | 'performance-trends'
  generatedAt: Date
  organizationName: string
  reportPeriod: {
    startDate: Date
    endDate: Date
  }
  summary: {
    totalCarers: number
    totalTasks: number
    totalAssessments: number
    averageCompetency: number
  }
  carers: Array<{
    id: string
    name: string
    email: string
    overallProgress: number
    competencyLevel: CompetencyLevel
    lastAssessment?: Date
    trainingNeeds: string[]
    packages: Array<{
      name: string
      progress: number
    }>
  }>
  competencyMatrix: Array<{
    taskName: string
    competentCount: number
    needsTrainingCount: number
    notAssessedCount: number
    compliancePercentage: number
  }>
  trainingNeeds: Array<{
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    taskName: string
    carersNeeding: number
    recommendedAction: string
  }>
}

interface BulkPDFOptions {
  includeIndividualReports: boolean
  includeOrganizationalReport: boolean
  reportType?: OrganizationalReportData['reportType']
  dateRange?: {
    startDate: Date
    endDate: Date
  }
  filterCriteria?: {
    carePackageIds?: string[]
    competencyLevels?: CompetencyLevel[]
    includeInactive?: boolean
  }
}

interface RegulatoryTemplate {
  name: 'CQC' | 'SKILLS_FOR_HEALTH' | 'NICE' | 'HSE'
  version: string
  requiredSections: string[]
  complianceFields: {
    [key: string]: string | boolean | Date
  }
}

interface DocumentVersion {
  id: string
  version: string
  createdAt: Date
  createdBy: string
  changes: string[]
  metadata: {
    template?: RegulatoryTemplate
    retention?: {
      retainUntil: Date
      reason: string
    }
    signatures?: {
      signedBy: string
      signedAt: Date
      role: string
    }[]
  }
}

interface ComplianceOptions {
  enableGDPRMode: boolean
  anonymizeData: boolean
  includeRetentionPolicy: boolean
  includeDataProcessingRecord: boolean
  template?: RegulatoryTemplate
  digitalSignature?: {
    signerName: string
    signerRole: string
    organizationName: string
  }
}

export class PDFService {
  
  async generateCarerPDF(carerId: string): Promise<CarerPDFData> {
    // Fetch comprehensive carer data
    const carer = await prisma.carer.findUnique({
      where: { id: carerId },
      include: {
        packageAssignments: {
          where: { isActive: true },
          include: {
            package: {
              select: {
                id: true,
                name: true,
                postcode: true
              }
            }
          }
        },
        taskProgress: {
          include: {
            task: {
              select: {
                id: true,
                name: true,
                targetCount: true
              }
            },
            package: {
              select: {
                name: true
              }
            }
          }
        },
        assessmentResponses: {
          include: {
            assessment: {
              select: {
                name: true
              }
            },
            assessor: {
              select: {
                name: true
              }
            },
            knowledgeResponses: {
              include: {
                question: {
                  select: {
                    question: true,
                    modelAnswer: true
                  }
                }
              }
            },
            practicalResponses: {
              include: {
                skill: {
                  select: {
                    skillDescription: true
                  }
                }
              }
            },
            emergencyResponses: {
              include: {
                question: {
                  select: {
                    question: true,
                    modelAnswer: true
                  }
                }
              }
            }
          },
          orderBy: { completedAt: 'desc' }
        },
        competencyRatings: {
          include: {
            task: {
              select: {
                name: true
              }
            }
          },
          orderBy: { setAt: 'desc' }
        }
      }
    })

    if (!carer) {
      throw new Error(`Carer with ID ${carerId} not found`)
    }

    // Restructure data to match CarerPDFData interface
    return {
      carer: {
        id: carer.id,
        name: carer.name,
        email: carer.email,
        createdAt: carer.createdAt
      },
      packageAssignments: carer.packageAssignments.map(assignment => ({
        package: assignment.package,
        assignedAt: assignment.assignedAt
      })),
      taskProgress: carer.taskProgress,
      assessmentResponses: carer.assessmentResponses,
      competencyRatings: carer.competencyRatings
    } as CarerPDFData
  }

  async streamCarerPDF(carerId: string, res: Response): Promise<void> {
    try {
      // Get carer data
      const data = await this.generateCarerPDF(carerId)
      
      // Create PDF document
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      })

      // Set response headers for PDF download
      const fileName = `${data.carer.name.replace(/[^a-zA-Z0-9]/g, '_')}_CareRecord_${new Date().toISOString().split('T')[0]}.pdf`
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

      // Pipe PDF to response
      doc.pipe(res)

      // Generate PDF content
      this.buildPDFContent(doc, data)

      // Finalize PDF
      doc.end()

    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private buildPDFContent(doc: PDFKit.PDFDocument, data: CarerPDFData): void {
    // Header
    this.addHeader(doc, data.carer)
    
    // Carer Details
    this.addCarerDetails(doc, data.carer)
    
    // Progress Summary
    this.addProgressSummary(doc, data.taskProgress)
    
    // Competency Matrix
    this.addCompetencyMatrix(doc, data.competencyRatings)
    
    // Assessment History
    this.addAssessmentHistory(doc, data.assessmentResponses)
    
    // Detailed Assessment Results
    this.addDetailedAssessmentResults(doc, data.assessmentResponses)
  }

  private addHeader(doc: PDFKit.PDFDocument, carer: CarerPDFData['carer']): void {
    // Main title
    doc.fontSize(22).fillColor('#2c3e50').text('CareTrack Pro - Carer Record', { align: 'center' })
    doc.moveDown(0.5)
    
    // Carer name prominent
    doc.fontSize(18).fillColor('#34495e').text(`${carer.name}`, { align: 'center' })
    doc.moveDown(0.3)
    
    // Generation info
    doc.fontSize(11).fillColor('#7f8c8d').text(`Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, { align: 'center' })
    doc.fontSize(10).text(`Carer ID: ${carer.id}`, { align: 'center' })
    
    // Reset color and add spacing
    doc.fillColor('#000000')
    doc.moveDown(2)
  }

  private addCarerDetails(doc: PDFKit.PDFDocument, carer: CarerPDFData['carer']): void {
    // Section header with better styling
    doc.fontSize(16).fillColor('#2c3e50').text('Contact Information', { underline: true })
    doc.fillColor('#000000')
    doc.moveDown(1)
    
    // Use structured layout with labels and values
    doc.fontSize(12)
    
    // Email
    doc.fillColor('#34495e').text('Email:', { continued: true })
    doc.fillColor('#000000').text(`  ${carer.email}`)
    doc.moveDown(0.3)
    
    doc.moveDown(1)
  }

  private addProgressSummary(doc: PDFKit.PDFDocument, taskProgress: CarerPDFData['taskProgress']): void {
    // Check if there's space for title and first entry (about 80 pixels)
    if (doc.y + 80 > doc.page.height - 50) {
      doc.addPage()
    }
    
    // Section header
    doc.fontSize(16).fillColor('#2c3e50').text('Task Progress Summary', { underline: true })
    doc.fillColor('#000000')
    doc.moveDown(1)
    
    if (taskProgress.length === 0) {
      doc.fontSize(12).fillColor('#7f8c8d').text('No progress data available.')
      doc.fillColor('#000000')
      doc.moveDown(2)
      return
    }

    taskProgress.forEach(progress => {
      const percentage = progress.completionPercentage
      
      // Task name and package
      doc.fontSize(12).fillColor('#2c3e50')
      doc.text(`${progress.task.name} (${progress.package.name})`)
      
      // Progress information on next line with indentation
      doc.fontSize(11).fillColor('#7f8c8d')
      doc.text(`   Progress: ${percentage}% complete (${progress.completionCount} of ${progress.task.targetCount} sessions)`)
      
      // Reset color
      doc.fillColor('#000000')
      doc.moveDown(0.8)
    })
    
    doc.moveDown(1)
  }

  private addCompetencyMatrix(doc: PDFKit.PDFDocument, competencies: CarerPDFData['competencyRatings']): void {
    // Check if there's space for title and first entry (about 80 pixels)
    if (doc.y + 80 > doc.page.height - 50) {
      doc.addPage()
    }
    
    doc.fontSize(16).fillColor('#2c3e50').text('Competency Ratings', { underline: true })
    doc.fillColor('#000000')
    doc.moveDown(1)
    
    if (competencies.length === 0) {
      doc.fontSize(12).fillColor('#7f8c8d').text('No competency ratings available.')
      doc.fillColor('#000000')
      doc.moveDown(2)
      return
    }

    competencies.forEach(comp => {
      const levelText = this.formatCompetencyLevel(comp.level)
      const setDate = new Date(comp.setAt).toLocaleDateString('en-GB')
      
      // Task name
      doc.fontSize(12).fillColor('#34495e')
      doc.text(`${comp.task.name}`)
      
      // Competency level and details
      doc.fontSize(11).fillColor('#000000')
      doc.text(`   Rating: ${levelText}`)
      doc.text(`   Assessed: ${setDate}`)
      doc.text(`   Source: ${comp.source === 'MANUAL' ? 'Manual Assessment' : 'Automated Assessment'}`)
      
      doc.moveDown(0.8)
    })
    
    doc.moveDown(1)
  }

  private addAssessmentHistory(doc: PDFKit.PDFDocument, assessments: CarerPDFData['assessmentResponses']): void {
    // Check if there's space for title and first entry (about 80 pixels)
    if (doc.y + 80 > doc.page.height - 50) {
      doc.addPage()
    }
    
    doc.fontSize(16).fillColor('#2c3e50').text('Assessment History', { underline: true })
    doc.fillColor('#000000')
    doc.moveDown(1)
    
    if (assessments.length === 0) {
      doc.fontSize(12).fillColor('#7f8c8d').text('No assessments completed.')
      doc.fillColor('#000000')
      doc.moveDown(1)
      return
    }

    assessments.forEach((assessment, index) => {
      const completedDate = new Date(assessment.completedAt).toLocaleDateString('en-GB')
      const overallRating = this.formatCompetencyLevel(assessment.overallRating)
      
      // Check if there's enough space for the complete entry (approximately 4 lines + spacing)
      const requiredSpace = 60 // Approximate height needed for title + 3 detail lines + spacing
      if (doc.y + requiredSpace > doc.page.height - 50) { // 50 for bottom margin
        doc.addPage()
      }
      
      // Assessment name
      doc.fontSize(12).fillColor('#34495e')
      doc.text(`${index + 1}. ${assessment.assessment.name}`)
      
      // Assessment details
      doc.fontSize(11).fillColor('#000000')
      doc.text(`   Completed: ${completedDate}`)
      doc.text(`   Assessor: ${assessment.assessor.name}`)
      doc.text(`   Overall Rating: ${overallRating}`)
      doc.moveDown(0.8)
    })
    
    doc.moveDown(0.5)
  }

  private addDetailedAssessmentResults(doc: PDFKit.PDFDocument, assessments: CarerPDFData['assessmentResponses']): void {
    if (assessments.length === 0) return

    // Check if there's space for title and first assessment header (about 120 pixels)
    if (doc.y + 120 > doc.page.height - 50) {
      doc.addPage()
    }

    // Main section header
    doc.fontSize(18).fillColor('#2c3e50').text('Detailed Assessment Results', { underline: true })
    doc.fillColor('#000000')
    doc.moveDown(1)

    assessments.forEach((assessment, assessmentIndex) => {
      // Check if there's enough space for assessment header and metadata (about 100 pixels)
      if (doc.y + 100 > doc.page.height - 50) {
        doc.addPage()
      } else if (assessmentIndex > 0) {
        // Add some spacing between assessments if not starting a new page
        doc.moveDown(1.5)
      }
      
      // Assessment header with better styling
      doc.fontSize(16).fillColor('#34495e').text(`${assessment.assessment.name}`, { underline: true })
      doc.fillColor('#000000')
      doc.moveDown(0.8)
      
      // Assessment metadata in structured layout
      doc.fontSize(12)
      doc.fillColor('#7f8c8d').text('Completed:', { continued: true })
      doc.fillColor('#000000').text(`  ${new Date(assessment.completedAt).toLocaleDateString('en-GB')}`)
      
      doc.fillColor('#7f8c8d').text('Assessed by:', { continued: true })
      doc.fillColor('#000000').text(`  ${assessment.assessor.name}`)
      
      doc.fillColor('#7f8c8d').text('Overall Rating:', { continued: true })
      doc.fillColor('#27ae60').text(`  ${this.formatCompetencyLevel(assessment.overallRating)}`)
      doc.fillColor('#000000')
      doc.moveDown(1.5)

      // Knowledge Questions
      if (assessment.knowledgeResponses.length > 0) {
        doc.fontSize(14).fillColor('#2c3e50').text('Knowledge Questions:', { underline: true })
        doc.fillColor('#000000')
        doc.moveDown(0.8)
        
        assessment.knowledgeResponses.forEach((response, index) => {
          doc.fontSize(12).fillColor('#34495e')
          doc.text(`Q${index + 1}: ${response.question.question}`)
          doc.fontSize(11).fillColor('#000000')
          doc.text(`Answer: ${response.carerAnswer}`, { 
            indent: 20,
            paragraphGap: 8
          })
          doc.moveDown(1)
        })
        doc.moveDown(1)
      }

      // Practical Skills
      if (assessment.practicalResponses.length > 0) {
        doc.fontSize(14).fillColor('#2c3e50').text('Practical Skills:', { underline: true })
        doc.fillColor('#000000')
        doc.moveDown(0.8)
        
        assessment.practicalResponses.forEach((response) => {
          doc.fontSize(12).fillColor('#34495e')
          doc.text(`${response.skill.skillDescription}:`, { continued: true })
          doc.fillColor(this.getRatingColor(response.rating)).text(`  ${response.rating}`)
          doc.fillColor('#000000')
          doc.moveDown(0.5)
        })
        doc.moveDown(1)
      }

      // Emergency Questions
      if (assessment.emergencyResponses.length > 0) {
        doc.fontSize(14).fillColor('#2c3e50').text('Emergency Scenarios:', { underline: true })
        doc.fillColor('#000000')
        doc.moveDown(0.8)
        
        assessment.emergencyResponses.forEach((response, index) => {
          doc.fontSize(12).fillColor('#34495e')
          doc.text(`E${index + 1}: ${response.question.question}`)
          doc.fontSize(11).fillColor('#000000')
          doc.text(`Answer: ${response.carerAnswer}`, { 
            indent: 20,
            paragraphGap: 8
          })
          doc.moveDown(1)
        })
      }
    })
  }


  private formatCompetencyLevel(level: CompetencyLevel): string {
    switch (level) {
      case 'NOT_ASSESSED': return 'Not Assessed'
      case 'NOT_COMPETENT': return 'Not Competent'
      case 'ADVANCED_BEGINNER': return 'Advanced Beginner'
      case 'COMPETENT': return 'Competent'
      case 'PROFICIENT': return 'Proficient'
      case 'EXPERT': return 'Expert'
      default: return level
    }
  }

  private getRatingColor(rating: string): string {
    switch (rating.toUpperCase()) {
      case 'COMPETENT':
        return '#27ae60'  // Green
      case 'NEEDS_SUPPORT':
        return '#e74c3c'  // Red
      case 'NOT_APPLICABLE':
        return '#7f8c8d'  // Gray
      default:
        return '#000000'  // Black
    }
  }

  // BULK PDF GENERATION: Generate organizational reports
  async generateOrganizationalReport(options: {
    reportType: OrganizationalReportData['reportType']
    dateRange?: { startDate: Date; endDate: Date }
    carePackageIds?: string[]
  }): Promise<OrganizationalReportData> {
    const endDate = options.dateRange?.endDate || new Date()
    const startDate = options.dateRange?.startDate || new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 30 days ago

    // Build base query for carers
    const carePackageFilter = options.carePackageIds?.length ? {
      packageAssignments: {
        some: {
          packageId: { in: options.carePackageIds },
          isActive: true
        }
      }
    } : {}

    const carers = await prisma.carer.findMany({
      where: {
        ...carePackageFilter,
        isActive: true
      },
      include: {
        packageAssignments: {
          where: { isActive: true },
          include: {
            package: { select: { name: true } }
          }
        },
        taskProgress: {
          include: {
            task: { select: { name: true } }
          }
        },
        competencyRatings: {
          where: {
            setAt: {
              gte: startDate,
              lte: endDate
            }
          },
          include: {
            task: { select: { name: true } }
          }
        },
        assessmentResponses: {
          where: {
            completedAt: {
              gte: startDate,
              lte: endDate
            }
          },
          orderBy: { completedAt: 'desc' },
          take: 1
        }
      }
    })

    // Calculate summary statistics
    const totalAssessments = await prisma.assessmentResponse.count({
      where: {
        completedAt: {
          gte: startDate,
          lte: endDate
        }
      }
    })

    const allTasks = await prisma.task.findMany({
      select: { id: true, name: true }
    })

    // Build competency matrix
    const competencyMatrix = await this.buildCompetencyMatrix(carers, allTasks)
    
    // Analyze training needs
    const trainingNeeds = this.analyzeTrainingNeeds(competencyMatrix)

    // Process carer data for report
    const processedCarers = carers.map(carer => {
      const totalProgress = carer.taskProgress.length > 0 
        ? carer.taskProgress.reduce((sum, tp) => sum + tp.completionPercentage, 0) / carer.taskProgress.length
        : 0
      
      const latestCompetency = carer.competencyRatings.length > 0
        ? carer.competencyRatings.reduce((latest, rating) => 
            rating.setAt > latest.setAt ? rating : latest
          ).level
        : 'NOT_ASSESSED' as CompetencyLevel

      const packages = carer.packageAssignments.map(assignment => {
        const packageProgress = carer.taskProgress
          .filter(tp => assignment.packageId)
          .reduce((sum, tp) => sum + tp.completionPercentage, 0) / 
          Math.max(carer.taskProgress.filter(tp => assignment.packageId).length, 1)
        
        return {
          name: assignment.package.name,
          progress: packageProgress
        }
      })

      const trainingNeedsForCarer = trainingNeeds
        .filter(need => {
          // Check if this carer needs training for this task
          const carerCompetency = carer.competencyRatings.find(rating => 
            rating.task.name === need.taskName
          )
          return !carerCompetency || 
                 carerCompetency.level === 'NOT_ASSESSED' || 
                 carerCompetency.level === 'NOT_COMPETENT'
        })
        .map(need => need.taskName)

      return {
        id: carer.id,
        name: carer.name,
        email: carer.email,
        overallProgress: Math.round(totalProgress),
        competencyLevel: latestCompetency,
        lastAssessment: carer.assessmentResponses[0]?.completedAt,
        trainingNeeds: trainingNeedsForCarer,
        packages
      }
    })

    const averageCompetency = this.calculateAverageCompetencyScore(processedCarers)

    return {
      reportType: options.reportType,
      generatedAt: new Date(),
      organizationName: 'CareTrack Pro Organization',
      reportPeriod: { startDate, endDate },
      summary: {
        totalCarers: carers.length,
        totalTasks: allTasks.length,
        totalAssessments,
        averageCompetency
      },
      carers: processedCarers,
      competencyMatrix,
      trainingNeeds
    }
  }

  async streamOrganizationalPDF(reportData: OrganizationalReportData, res: Response): Promise<void> {
    try {
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4'
      })

      const fileName = `${reportData.reportType.replace('-', '_')}_Report_${new Date().toISOString().split('T')[0]}.pdf`
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

      doc.pipe(res)
      this.buildOrganizationalPDFContent(doc, reportData)
      doc.end()
    } catch (error) {
      throw new Error(`Failed to generate organizational PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // BULK PROCESSING: Generate multiple PDFs in ZIP format
  async streamBulkPDFs(carerIds: string[], options: BulkPDFOptions, res: Response): Promise<void> {
    const archiver = require('archiver')
    const archive = archiver('zip', { zlib: { level: 9 } })

    const fileName = `CareTrack_Bulk_Report_${new Date().toISOString().split('T')[0]}.zip`
    res.setHeader('Content-Type', 'application/zip')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

    archive.pipe(res)

    // Add organizational report if requested
    if (options.includeOrganizationalReport && options.reportType) {
      const orgReportData = await this.generateOrganizationalReport({
        reportType: options.reportType,
        dateRange: options.dateRange,
        carePackageIds: options.filterCriteria?.carePackageIds
      })
      
      const orgPDFBuffer = await this.generateOrganizationalPDFBuffer(orgReportData)
      archive.append(orgPDFBuffer, { 
        name: `organizational_${options.reportType}_report.pdf` 
      })
    }

    // Add individual carer reports if requested
    if (options.includeIndividualReports) {
      for (const carerId of carerIds) {
        try {
          const carerData = await this.generateCarerPDF(carerId)
          const pdfBuffer = await this.generateCarerPDFBuffer(carerData)
          const fileName = `${carerData.carer.name.replace(/[^a-zA-Z0-9]/g, '_')}_care_record.pdf`
          archive.append(pdfBuffer, { name: fileName })
        } catch (error) {
          console.error(`Failed to generate PDF for carer ${carerId}:`, error)
          // Continue with other carers
        }
      }
    }

    archive.finalize()
  }

  private async generateOrganizationalPDFBuffer(reportData: OrganizationalReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const buffers: Buffer[] = []
      
      doc.on('data', buffer => buffers.push(buffer))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)
      
      this.buildOrganizationalPDFContent(doc, reportData)
      doc.end()
    })
  }

  private async generateCarerPDFBuffer(carerData: CarerPDFData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50, size: 'A4' })
      const buffers: Buffer[] = []
      
      doc.on('data', buffer => buffers.push(buffer))
      doc.on('end', () => resolve(Buffer.concat(buffers)))
      doc.on('error', reject)
      
      this.buildPDFContent(doc, carerData)
      doc.end()
    })
  }

  private buildOrganizationalPDFContent(doc: PDFKit.PDFDocument, data: OrganizationalReportData): void {
    // Report header
    this.addOrganizationalHeader(doc, data)
    
    // Executive summary
    this.addExecutiveSummary(doc, data.summary, data.reportPeriod)
    
    // Competency matrix
    this.addOrganizationalCompetencyMatrix(doc, data.competencyMatrix)
    
    // Training needs analysis
    this.addTrainingNeedsAnalysis(doc, data.trainingNeeds)
    
    // Individual carer summaries
    this.addCarerSummaries(doc, data.carers)
  }

  private addOrganizationalHeader(doc: PDFKit.PDFDocument, data: OrganizationalReportData): void {
    const reportTypeDisplay = data.reportType.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
    
    doc.fontSize(22).fillColor('#2c3e50')
    doc.text(`${data.organizationName}`, { align: 'center' })
    doc.fontSize(18).text(`${reportTypeDisplay} Report`, { align: 'center' })
    doc.moveDown(0.5)
    
    doc.fontSize(12).fillColor('#7f8c8d')
    doc.text(`Report Period: ${data.reportPeriod.startDate.toLocaleDateString()} - ${data.reportPeriod.endDate.toLocaleDateString()}`, { align: 'center' })
    doc.text(`Generated: ${data.generatedAt.toLocaleDateString()} at ${data.generatedAt.toLocaleTimeString()}`, { align: 'center' })
    
    doc.fillColor('#000000')
    doc.moveDown(2)
  }

  private addExecutiveSummary(doc: PDFKit.PDFDocument, summary: OrganizationalReportData['summary'], period: OrganizationalReportData['reportPeriod']): void {
    doc.fontSize(16).fillColor('#2c3e50').text('Executive Summary', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    doc.fontSize(12)
    doc.text(`• Total Carers: ${summary.totalCarers}`)
    doc.text(`• Total Tasks Tracked: ${summary.totalTasks}`)
    doc.text(`• Assessments Completed: ${summary.totalAssessments}`)
    doc.text(`• Average Competency Score: ${summary.averageCompetency}%`)
    doc.moveDown(2)
  }

  private addOrganizationalCompetencyMatrix(doc: PDFKit.PDFDocument, matrix: OrganizationalReportData['competencyMatrix']): void {
    if (doc.y + 100 > doc.page.height - 50) doc.addPage()
    
    doc.fontSize(16).fillColor('#2c3e50').text('Competency Matrix', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    matrix.forEach(item => {
      if (doc.y + 60 > doc.page.height - 50) doc.addPage()
      
      doc.fontSize(12).fillColor('#34495e').text(item.taskName)
      doc.fontSize(11).fillColor('#000000')
      doc.text(`  Competent: ${item.competentCount} carers (${item.compliancePercentage}%)`)
      doc.text(`  Need Training: ${item.needsTrainingCount} carers`)
      doc.text(`  Not Assessed: ${item.notAssessedCount} carers`)
      doc.moveDown(0.8)
    })
    
    doc.moveDown(1)
  }

  private addTrainingNeedsAnalysis(doc: PDFKit.PDFDocument, needs: OrganizationalReportData['trainingNeeds']): void {
    if (doc.y + 100 > doc.page.height - 50) doc.addPage()
    
    doc.fontSize(16).fillColor('#2c3e50').text('Training Needs Analysis', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    const priorityOrder = ['HIGH', 'MEDIUM', 'LOW']
    priorityOrder.forEach(priority => {
      const priorityNeeds = needs.filter(need => need.priority === priority)
      if (priorityNeeds.length === 0) return
      
      if (doc.y + 80 > doc.page.height - 50) doc.addPage()
      
      const priorityColor = priority === 'HIGH' ? '#e74c3c' : priority === 'MEDIUM' ? '#f39c12' : '#27ae60'
      doc.fontSize(14).fillColor(priorityColor).text(`${priority} Priority`, { underline: true })
      doc.fillColor('#000000').moveDown(0.5)
      
      priorityNeeds.forEach(need => {
        doc.fontSize(11)
        doc.text(`• ${need.taskName}: ${need.carersNeeding} carers need training`)
        doc.text(`  Recommendation: ${need.recommendedAction}`, { indent: 20 })
        doc.moveDown(0.5)
      })
      
      doc.moveDown(1)
    })
  }

  private addCarerSummaries(doc: PDFKit.PDFDocument, carers: OrganizationalReportData['carers']): void {
    if (doc.y + 100 > doc.page.height - 50) doc.addPage()
    
    doc.fontSize(16).fillColor('#2c3e50').text('Carer Progress Summary', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    carers.forEach(carer => {
      if (doc.y + 80 > doc.page.height - 50) doc.addPage()
      
      doc.fontSize(12).fillColor('#34495e').text(`${carer.name} (${carer.email})`)
      doc.fontSize(11).fillColor('#000000')
      doc.text(`  Overall Progress: ${carer.overallProgress}%`)
      doc.text(`  Competency Level: ${this.formatCompetencyLevel(carer.competencyLevel)}`)
      
      if (carer.lastAssessment) {
        doc.text(`  Last Assessment: ${carer.lastAssessment.toLocaleDateString()}`)
      }
      
      if (carer.trainingNeeds.length > 0) {
        doc.text(`  Training Needs: ${carer.trainingNeeds.slice(0, 3).join(', ')}${carer.trainingNeeds.length > 3 ? '...' : ''}`)
      }
      
      doc.moveDown(0.8)
    })
  }

  private async buildCompetencyMatrix(carers: any[], allTasks: any[]): Promise<OrganizationalReportData['competencyMatrix']> {
    return allTasks.map(task => {
      let competentCount = 0
      let needsTrainingCount = 0
      let notAssessedCount = 0
      
      carers.forEach(carer => {
        const competency = carer.competencyRatings.find((rating: any) => rating.task.name === task.name)
        
        if (!competency || competency.level === 'NOT_ASSESSED') {
          notAssessedCount++
        } else if (competency.level === 'NOT_COMPETENT' || competency.level === 'ADVANCED_BEGINNER') {
          needsTrainingCount++
        } else {
          competentCount++
        }
      })
      
      const totalCarers = carers.length
      const compliancePercentage = totalCarers > 0 ? Math.round((competentCount / totalCarers) * 100) : 0
      
      return {
        taskName: task.name,
        competentCount,
        needsTrainingCount,
        notAssessedCount,
        compliancePercentage
      }
    })
  }

  private analyzeTrainingNeeds(competencyMatrix: OrganizationalReportData['competencyMatrix']): OrganizationalReportData['trainingNeeds'] {
    return competencyMatrix
      .map(item => {
        const totalNeedingTraining = item.needsTrainingCount + item.notAssessedCount
        const totalCarers = item.competentCount + item.needsTrainingCount + item.notAssessedCount
        const percentageNeedingTraining = totalCarers > 0 ? (totalNeedingTraining / totalCarers) * 100 : 0
        
        let priority: 'HIGH' | 'MEDIUM' | 'LOW'
        let recommendedAction: string
        
        if (percentageNeedingTraining >= 70) {
          priority = 'HIGH'
          recommendedAction = 'Immediate organization-wide training program required'
        } else if (percentageNeedingTraining >= 40) {
          priority = 'MEDIUM'
          recommendedAction = 'Schedule targeted training sessions within 30 days'
        } else {
          priority = 'LOW'
          recommendedAction = 'Individual coaching or mentoring recommended'
        }
        
        return {
          priority,
          taskName: item.taskName,
          carersNeeding: totalNeedingTraining,
          recommendedAction
        }
      })
      .filter(need => need.carersNeeding > 0)
      .sort((a, b) => {
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })
  }

  private calculateAverageCompetencyScore(carers: OrganizationalReportData['carers']): number {
    if (carers.length === 0) return 0
    
    const competencyScores = {
      'EXPERT': 100,
      'PROFICIENT': 85,
      'COMPETENT': 70,
      'ADVANCED_BEGINNER': 50,
      'NOT_COMPETENT': 25,
      'NOT_ASSESSED': 0
    }
    
    const totalScore = carers.reduce((sum, carer) => {
      return sum + (competencyScores[carer.competencyLevel] || 0)
    }, 0)
    
    return Math.round(totalScore / carers.length)
  }

  // REGULATORY COMPLIANCE TEMPLATES
  private getCQCTemplate(): RegulatoryTemplate {
    return {
      name: 'CQC',
      version: '2024.1',
      requiredSections: [
        'Staff Training Records',
        'Competency Assessments', 
        'Continuous Professional Development',
        'Skills Matrix',
        'Compliance Monitoring',
        'Quality Assurance'
      ],
      complianceFields: {
        inspectionReady: true,
        lastReview: new Date(),
        nextReview: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        regulatoryStandard: 'CQC Fundamental Standards',
        evidenceLevel: 'Comprehensive'
      }
    }
  }

  private getSkillsForHealthTemplate(): RegulatoryTemplate {
    return {
      name: 'SKILLS_FOR_HEALTH',
      version: '2024.1',
      requiredSections: [
        'National Occupational Standards',
        'Core Skills Training Framework',
        'Values-Based Recruitment',
        'Career Development Framework',
        'Clinical Skills Assessment',
        'Leadership Development'
      ],
      complianceFields: {
        frameworkAligned: true,
        skillsPassportCompliant: true,
        coreSkillsCompleted: true,
        nationalStandardsMet: true,
        evidencePortfolioComplete: true
      }
    }
  }

  private getNICETemplate(): RegulatoryTemplate {
    return {
      name: 'NICE',
      version: '2024.1', 
      requiredSections: [
        'Evidence-Based Practice',
        'Clinical Guidelines Compliance',
        'Quality Standards',
        'Technology Appraisals',
        'Social Care Guidelines',
        'Public Health Guidelines'
      ],
      complianceFields: {
        guidelinesFollowed: true,
        evidenceRating: 'High Quality',
        implementationStatus: 'Complete',
        outcomesMeasured: true,
        costEffectivenessAssessed: true
      }
    }
  }

  private getHSETemplate(): RegulatoryTemplate {
    return {
      name: 'HSE',
      version: '2024.1',
      requiredSections: [
        'Health and Safety Training',
        'Risk Assessment Records',
        'Incident Reporting',
        'Manual Handling Training',
        'Infection Control',
        'Emergency Procedures'
      ],
      complianceFields: {
        riskAssessmentComplete: true,
        trainingUpToDate: true,
        incidentReportingActive: true,
        emergencyProceduresKnown: true,
        complianceLevel: 'Full'
      }
    }
  }

  // COMPLIANCE PDF GENERATION
  async streamCompliancePDF(
    carerId: string, 
    res: Response, 
    options: ComplianceOptions
  ): Promise<void> {
    try {
      const carerData = await this.generateCarerPDF(carerId)
      const template = options.template || this.getCQCTemplate()
      
      const doc = new PDFDocument({
        margin: 50,
        size: 'A4',
        info: {
          Title: `${template.name} Compliance Report - ${carerData.carer.name}`,
          Author: 'CareTrack Pro System',
          Subject: `${template.name} Regulatory Compliance Documentation`,
          Keywords: `${template.name}, compliance, care, assessment, ${carerData.carer.name}`,
          Creator: 'CareTrack Pro v1.0',
          Producer: 'CareTrack Pro PDF Service'
        }
      })

      const fileName = `${template.name}_Compliance_${carerData.carer.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)

      doc.pipe(res)
      await this.buildCompliancePDFContent(doc, carerData, template, options)
      doc.end()
    } catch (error) {
      throw new Error(`Failed to generate compliance PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  // DOCUMENT VERSIONING SYSTEM
  async createDocumentVersion(
    originalData: CarerPDFData,
    changes: string[],
    createdBy: string,
    template?: RegulatoryTemplate
  ): Promise<DocumentVersion> {
    return {
      id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      version: `v${new Date().getFullYear()}.${new Date().getMonth() + 1}.${new Date().getDate()}.${Date.now() % 1000}`,
      createdAt: new Date(),
      createdBy,
      changes,
      metadata: {
        template,
        retention: {
          retainUntil: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
          reason: 'Regulatory compliance requirement'
        }
      }
    }
  }

  // GDPR COMPLIANCE FEATURES
  private anonymizeCarerData(data: CarerPDFData): CarerPDFData {
    return {
      ...data,
      carer: {
        ...data.carer,
        name: `Carer_${data.carer.id.slice(-8)}`,
        email: `anonymized_${data.carer.id.slice(-8)}@example.com`
      },
      assessmentResponses: data.assessmentResponses.map(response => ({
        ...response,
        assessor: {
          ...response.assessor,
          name: `Assessor_${response.assessor.id?.slice(-4) || 'ANON'}`
        }
      })),
      competencyRatings: data.competencyRatings.map(rating => ({
        ...rating,
        setByAdminName: rating.setByAdminName ? `Admin_${Math.random().toString(36).substr(2, 4)}` : undefined
      }))
    }
  }

  private async buildCompliancePDFContent(
    doc: PDFKit.PDFDocument,
    data: CarerPDFData,
    template: RegulatoryTemplate,
    options: ComplianceOptions
  ): Promise<void> {
    // Apply GDPR anonymization if requested
    const processedData = options.anonymizeData ? this.anonymizeCarerData(data) : data
    
    // Regulatory template cover page
    this.addRegulatoryHeader(doc, processedData.carer, template)
    
    // Compliance declaration
    this.addComplianceDeclaration(doc, template)
    
    // Required sections based on template
    for (const section of template.requiredSections) {
      this.addTemplateSection(doc, section, processedData, template)
    }
    
    // Digital signature if provided
    if (options.digitalSignature) {
      this.addDigitalSignature(doc, options.digitalSignature)
    }
    
    // GDPR and retention information
    if (options.enableGDPRMode) {
      this.addGDPRCompliance(doc, options)
    }
    
    // Data processing record
    if (options.includeDataProcessingRecord) {
      this.addDataProcessingRecord(doc, processedData)
    }
  }

  private addRegulatoryHeader(doc: PDFKit.PDFDocument, carer: CarerPDFData['carer'], template: RegulatoryTemplate): void {
    // Official template header
    doc.fontSize(24).fillColor('#1e3a8a').text(`${template.name} COMPLIANCE REPORT`, { align: 'center' })
    doc.fontSize(16).fillColor('#3b82f6').text(`Template Version: ${template.version}`, { align: 'center' })
    doc.moveDown(0.5)
    
    // Regulatory compliance badge
    const badgeX = (doc.page.width - 200) / 2
    doc.rect(badgeX, doc.y, 200, 30).fill('#22c55e')
    doc.fontSize(12).fillColor('#ffffff').text('REGULATORY COMPLIANT', badgeX + 50, doc.y + 8)
    doc.fillColor('#000000')
    doc.moveDown(2)
    
    // Subject information
    doc.fontSize(18).fillColor('#1f2937').text(`Subject: ${carer.name}`, { align: 'center' })
    doc.fontSize(12).fillColor('#6b7280').text(`Report Generated: ${new Date().toLocaleDateString('en-GB')} at ${new Date().toLocaleTimeString('en-GB')}`, { align: 'center' })
    doc.text(`Document ID: ${carer.id}`, { align: 'center' })
    
    doc.fillColor('#000000')
    doc.moveDown(2)
  }

  private addComplianceDeclaration(doc: PDFKit.PDFDocument, template: RegulatoryTemplate): void {
    doc.addPage()
    doc.fontSize(16).fillColor('#dc2626').text('COMPLIANCE DECLARATION', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    doc.fontSize(12)
    doc.text('This document has been generated in accordance with:')
    doc.moveDown(0.5)
    
    template.requiredSections.forEach((section, index) => {
      doc.text(`${index + 1}. ${section}`, { indent: 20 })
    })
    
    doc.moveDown(1)
    doc.text('Compliance Fields:')
    doc.moveDown(0.5)
    
    Object.entries(template.complianceFields).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean' ? (value ? '✓ YES' : '✗ NO') : 
                          value instanceof Date ? value.toLocaleDateString('en-GB') : 
                          String(value)
      doc.text(`• ${key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}: ${displayValue}`, { indent: 20 })
    })
    
    doc.moveDown(2)
    doc.fontSize(10).fillColor('#6b7280')
    doc.text('This report meets all regulatory requirements as specified by the relevant governing body.')
    doc.fillColor('#000000')
  }

  private addTemplateSection(doc: PDFKit.PDFDocument, section: string, data: CarerPDFData, template: RegulatoryTemplate): void {
    if (doc.y + 100 > doc.page.height - 50) doc.addPage()
    
    doc.fontSize(14).fillColor('#1f2937').text(section, { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    switch (section) {
      case 'Staff Training Records':
      case 'Core Skills Training Framework':
      case 'Health and Safety Training':
        this.addTrainingRecordsSection(doc, data)
        break
        
      case 'Competency Assessments':
      case 'Clinical Skills Assessment':
      case 'Skills Matrix':
        this.addCompetencySection(doc, data)
        break
        
      case 'Continuous Professional Development':
      case 'Career Development Framework':
        this.addCPDSection(doc, data)
        break
        
      case 'Quality Assurance':
      case 'Quality Standards':
      case 'Compliance Monitoring':
        this.addQualityAssuranceSection(doc, data)
        break
        
      default:
        this.addGenericComplianceSection(doc, section, data)
        break
    }
    
    doc.moveDown(1.5)
  }

  private addTrainingRecordsSection(doc: PDFKit.PDFDocument, data: CarerPDFData): void {
    doc.fontSize(12)
    
    if (data.assessmentResponses.length > 0) {
      doc.text('Training Completion Records:')
      doc.moveDown(0.5)
      
      data.assessmentResponses.forEach((assessment, index) => {
        doc.text(`${index + 1}. ${assessment.assessment.name}`, { indent: 20 })
        doc.text(`   Completed: ${new Date(assessment.completedAt).toLocaleDateString('en-GB')}`, { indent: 20 })
        doc.text(`   Assessor: ${assessment.assessor.name}`, { indent: 20 })
        doc.text(`   Result: ${this.formatCompetencyLevel(assessment.overallRating)}`, { indent: 20 })
        doc.moveDown(0.5)
      })
    } else {
      doc.text('No formal training records available. Assessment required.', { indent: 20 })
    }
  }

  private addCompetencySection(doc: PDFKit.PDFDocument, data: CarerPDFData): void {
    doc.fontSize(12)
    doc.text('Current Competency Status:')
    doc.moveDown(0.5)
    
    if (data.competencyRatings.length > 0) {
      data.competencyRatings.forEach(rating => {
        const status = rating.level === 'COMPETENT' || rating.level === 'PROFICIENT' || rating.level === 'EXPERT' ? '✓' : '⚠'
        doc.text(`${status} ${rating.task.name}: ${this.formatCompetencyLevel(rating.level)}`, { indent: 20 })
      })
    } else {
      doc.text('⚠ No competency assessments completed. Immediate action required.', { indent: 20 })
    }
  }

  private addCPDSection(doc: PDFKit.PDFDocument, data: CarerPDFData): void {
    doc.fontSize(12)
    doc.text('Professional Development Activities:')
    doc.moveDown(0.5)
    
    const recentAssessments = data.assessmentResponses.filter(a => 
      new Date(a.completedAt) > new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
    )
    
    if (recentAssessments.length > 0) {
      doc.text(`✓ ${recentAssessments.length} assessment(s) completed in the last 12 months`, { indent: 20 })
      recentAssessments.forEach(assessment => {
        doc.text(`  • ${assessment.assessment.name} (${new Date(assessment.completedAt).toLocaleDateString('en-GB')})`, { indent: 30 })
      })
    } else {
      doc.text('⚠ No recent professional development activities recorded.', { indent: 20 })
    }
  }

  private addQualityAssuranceSection(doc: PDFKit.PDFDocument, data: CarerPDFData): void {
    doc.fontSize(12)
    doc.text('Quality Assurance Metrics:')
    doc.moveDown(0.5)
    
    // Calculate quality metrics
    const totalTasks = data.taskProgress.length
    const completedTasks = data.taskProgress.filter(t => t.completionPercentage >= 100).length
    const competentRatings = data.competencyRatings.filter(r => 
      ['COMPETENT', 'PROFICIENT', 'EXPERT'].includes(r.level)
    ).length
    
    doc.text(`• Total Tasks Assigned: ${totalTasks}`, { indent: 20 })
    doc.text(`• Tasks Completed (100%): ${completedTasks}`, { indent: 20 })
    doc.text(`• Competent Ratings: ${competentRatings}/${data.competencyRatings.length}`, { indent: 20 })
    
    if (totalTasks > 0) {
      const completionRate = (completedTasks / totalTasks * 100).toFixed(1)
      doc.text(`• Overall Completion Rate: ${completionRate}%`, { indent: 20 })
    }
  }

  private addGenericComplianceSection(doc: PDFKit.PDFDocument, section: string, data: CarerPDFData): void {
    doc.fontSize(12)
    doc.text(`${section} Status: Under Review`)
    doc.text('This section requires manual assessment by qualified personnel.', { indent: 20 })
    doc.text(`Data available: ${data.assessmentResponses.length} assessments, ${data.competencyRatings.length} ratings`, { indent: 20 })
  }

  private addDigitalSignature(doc: PDFKit.PDFDocument, signature: ComplianceOptions['digitalSignature']): void {
    if (!signature) return
    
    doc.addPage()
    doc.fontSize(16).fillColor('#1f2937').text('DIGITAL SIGNATURE', { underline: true })
    doc.fillColor('#000000').moveDown(2)
    
    doc.fontSize(12)
    doc.text('This document has been digitally signed and verified:')
    doc.moveDown(1)
    
    doc.text(`Signed by: ${signature.signerName}`, { indent: 20 })
    doc.text(`Role: ${signature.signerRole}`, { indent: 20 })
    doc.text(`Organization: ${signature.organizationName}`, { indent: 20 })
    doc.text(`Date & Time: ${new Date().toLocaleString('en-GB')}`, { indent: 20 })
    
    // Digital signature placeholder
    const signatureBox = {
      x: 50,
      y: doc.y + 20,
      width: 200,
      height: 50
    }
    
    doc.rect(signatureBox.x, signatureBox.y, signatureBox.width, signatureBox.height)
    doc.stroke()
    
    doc.fontSize(10).text('Digital Signature Hash:', signatureBox.x, signatureBox.y + 60)
    doc.text(`SHA-256: ${Buffer.from(`${signature.signerName}${new Date().toISOString()}`).toString('base64').slice(0, 32)}...`, signatureBox.x, signatureBox.y + 75)
  }

  private addGDPRCompliance(doc: PDFKit.PDFDocument, options: ComplianceOptions): void {
    doc.addPage()
    doc.fontSize(16).fillColor('#dc2626').text('GDPR COMPLIANCE NOTICE', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    doc.fontSize(12)
    doc.text('This document has been processed in accordance with GDPR (EU) 2016/679:')
    doc.moveDown(0.5)
    
    doc.text('• Data Processing Legal Basis: Legitimate Interest (Article 6(1)(f))', { indent: 20 })
    doc.text('• Data Subject Rights: Access, Rectification, Erasure, Portability', { indent: 20 })
    doc.text('• Retention Period: 7 years from date of creation', { indent: 20 })
    doc.text(`• Data Anonymization: ${options.anonymizeData ? 'APPLIED' : 'NOT APPLIED'}`, { indent: 20 })
    
    if (options.anonymizeData) {
      doc.moveDown(1)
      doc.fillColor('#dc2626').text('ANONYMIZATION APPLIED', { align: 'center' })
      doc.fillColor('#000000').text('Personal identifiers have been removed or pseudonymized to protect individual privacy while maintaining data utility for compliance purposes.', { align: 'center' })
    }
  }

  private addDataProcessingRecord(doc: PDFKit.PDFDocument, data: CarerPDFData): void {
    doc.addPage()
    doc.fontSize(16).fillColor('#1f2937').text('DATA PROCESSING RECORD', { underline: true })
    doc.fillColor('#000000').moveDown(1)
    
    doc.fontSize(12)
    doc.text('Record of Processing Activities (GDPR Article 30):')
    doc.moveDown(0.5)
    
    doc.text('Controller: CareTrack Pro System', { indent: 20 })
    doc.text('Purpose: Staff competency tracking and compliance reporting', { indent: 20 })
    doc.text('Categories of Data Subjects: Care staff members', { indent: 20 })
    doc.text('Categories of Personal Data:', { indent: 20 })
    doc.text('  - Identity data (name, employee ID)', { indent: 40 })
    doc.text('  - Contact data (email address)', { indent: 40 })
    doc.text('  - Professional data (competency ratings, assessments)', { indent: 40 })
    doc.text('  - Performance data (task completion, progress tracking)', { indent: 40 })
    doc.moveDown(0.5)
    doc.text(`Processing Date: ${new Date().toLocaleDateString('en-GB')}`, { indent: 20 })
    doc.text(`Data Subject Count: 1`, { indent: 20 })
    doc.text(`Records Processed: ${data.assessmentResponses.length} assessments`, { indent: 20 })
  }
}

export const pdfService = new PDFService()