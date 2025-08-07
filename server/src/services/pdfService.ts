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
}

export const pdfService = new PDFService()