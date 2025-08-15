import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { ShiftType, RotaEntry, BatchDeleteRotaRequest } from '@caretrack/shared'
import { schedulingRulesEngine, ScheduleValidationResult } from '../services/SchedulingRulesEngine'
import * as ExcelJS from 'exceljs'
import archiver from 'archiver'
import path from 'path'
import fs from 'fs'

const prisma = new PrismaClient()

// Type converter for ShiftType compatibility
function convertShiftType(shiftType: ShiftType | string): ShiftType {
  // Ensure the enum value is properly typed
  return shiftType as ShiftType
}

export interface CreateRotaEntryRequest {
  packageId: string
  carerId: string
  date: string // ISO date string
  shiftType: ShiftType
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  isConfirmed?: boolean
}

export interface UpdateRotaEntryRequest {
  packageId?: string
  carerId?: string
  date?: string
  shiftType?: ShiftType
  startTime?: string
  endTime?: string
  isConfirmed?: boolean
}

export interface BulkCreateRotaRequest {
  entries: CreateRotaEntryRequest[]
  validateOnly?: boolean
}


export interface WeeklyRotaRequest {
  packageId: string
  weekStart: string // ISO date string
}

export class RotaController {
  /**
   * Get rota entries with filtering and pagination
   */
  async getRotaEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        packageId,
        carerId,
        startDate,
        endDate,
        shiftType,
        isConfirmed,
        page = '1',
        limit = '50'
      } = req.query

      const pageNum = parseInt(page as string)
      const limitNum = parseInt(limit as string)
      const skip = (pageNum - 1) * limitNum

      // Type-safe where clause with proper validation
      interface RotaWhereClause {
        packageId?: string
        carerId?: string
        shiftType?: ShiftType
        isConfirmed?: boolean
        date?: {
          gte?: Date
          lte?: Date
        }
      }

      const where: RotaWhereClause = {}

      // Validate and sanitize inputs before adding to where clause
      if (packageId && typeof packageId === 'string' && packageId.match(/^[a-zA-Z0-9_-]+$/)) {
        where.packageId = packageId
      }
      if (carerId && typeof carerId === 'string' && carerId.match(/^[a-zA-Z0-9_-]+$/)) {
        where.carerId = carerId
      }
      if (shiftType && Object.values(ShiftType).includes(shiftType as ShiftType)) {
        where.shiftType = shiftType as ShiftType
      }
      if (isConfirmed !== undefined) {
        where.isConfirmed = isConfirmed === 'true'
      }

      if (startDate || endDate) {
        where.date = {}
        if (startDate && !isNaN(Date.parse(startDate as string))) {
          where.date.gte = new Date(startDate as string)
        }
        if (endDate && !isNaN(Date.parse(endDate as string))) {
          where.date.lte = new Date(endDate as string)
        }
      }

      const [entries, total] = await Promise.all([
        prisma.rotaEntry.findMany({
          where,
          include: {
            carer: {
              select: {
                id: true,
                name: true,
                email: true,
                // phone: true, // Field removed - not in schema
                competencyRatings: {
                  include: { task: true }
                }
              }
            },
            package: {
              select: {
                id: true,
                name: true,
                postcode: true
              }
            }
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' }
          ],
          skip,
          take: limitNum
        }),
        prisma.rotaEntry.count({ where })
      ])

      res.json({
        success: true,
        data: entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get weekly schedule for a specific package
   */
  async getWeeklySchedule(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId, weekStart } = req.query

      if (!packageId || !weekStart) {
        return res.status(400).json({
          success: false,
          error: 'Package ID and week start date are required'
        })
      }

      const weekStartDate = new Date(weekStart as string)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 7)

      // Get all entries for the week
      const weekEntries = await prisma.rotaEntry.findMany({
        where: {
          packageId: packageId as string,
          date: {
            gte: weekStartDate,
            lt: weekEndDate
          }
        },
        include: {
          carer: {
            select: {
              id: true,
              name: true,
              email: true,
              competencyRatings: {
                include: { task: true }
              }
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              postcode: true
            }
          }
        },
        orderBy: [
          { date: 'asc' },
          { startTime: 'asc' }
        ]
      })

      // Validate the weekly schedule
      const weeklySchedules = await schedulingRulesEngine.validateWeeklySchedule(
        packageId as string,
        weekStartDate
      );

      // Get package tasks for competency calculation
      const packageTasks = await prisma.packageTaskAssignment.findMany({
        where: {
          packageId: packageId as string,
          isActive: true,
          task: { deletedAt: null }
        },
        include: {
          task: { select: { id: true, name: true } }
        }
      })
      const packageTaskIds = packageTasks.map(pt => pt.taskId)

      // Helper function to calculate package-specific competency
      const calculatePackageCompetency = (carer: {
        id: string;
        name: string; 
        email: string;
        competencyRatings: Array<{
          taskId: string;
          level: string;
          task: { id: string; name: string };
        }>;
      }) => {
        if (packageTaskIds.length === 0) {
          // No tasks assigned to package
          return {
            ...carer,
            packageCompetency: {
              competentTaskCount: 0,
              totalTaskCount: 0,
              isPackageCompetent: false,
              hasNoTasks: true
            }
          }
        }

        // Filter competency ratings for package tasks only
        const packageCompetencies = carer.competencyRatings.filter(rating =>
          packageTaskIds.includes(rating.taskId) &&
          ['COMPETENT', 'PROFICIENT', 'EXPERT'].includes(rating.level)
        )

        return {
          ...carer,
          packageCompetency: {
            competentTaskCount: packageCompetencies.length,
            totalTaskCount: packageTaskIds.length,
            isPackageCompetent: packageCompetencies.length > 0,
            hasNoTasks: false,
            packageTasks: packageTasks.map(pt => pt.task)
          }
        }
      }

      // Get package-assigned carers
      const packageCarers = await prisma.carerPackageAssignment.findMany({
        where: {
          packageId: packageId as string,
          isActive: true,
          carer: { deletedAt: null, isActive: true }
        },
        include: {
          carer: {
            include: {
              competencyRatings: {
                include: { task: true }
              }
            }
          }
        }
      })

      // Get all other active carers
      const packageCarerIds = packageCarers.map(pc => pc.carerId)
      const otherCarers = await prisma.carer.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          id: { notIn: packageCarerIds }
        },
        include: {
          competencyRatings: {
            include: { task: true }
          }
        }
      })

      res.json({
        success: true,
        data: {
          weekStart: weekStartDate,
          weekEnd: weekEndDate,
          entries: weekEntries,
          weeklySchedules,
          packageCarers: packageCarers.map(pc => calculatePackageCompetency(pc.carer)),
          otherCarers: otherCarers.map(calculatePackageCompetency)
        }
      })
    } catch (error) {
      console.error('Error in getWeeklySchedule:', error);
      next(error)
    }
  }

  /**
   * Create a single rota entry
   */
  async createRotaEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const data: CreateRotaEntryRequest = req.body

      // Validate required fields
      if (!data.packageId || !data.carerId || !data.date || !data.shiftType || !data.startTime || !data.endTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: packageId, carerId, date, shiftType, startTime, endTime'
        })
      }

      // Check for duplicate shifts first (before other validation)
      const existingShift = await prisma.rotaEntry.findFirst({
        where: {
          carerId: data.carerId,
          packageId: data.packageId,
          date: new Date(data.date)
        }
      })

      if (existingShift) {
        const date = new Date(data.date)
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
        const dayNumber = date.getDate()
        
        return res.status(400).json({
          success: false,
          error: `Carer already scheduled on ${dayName} ${dayNumber}`,
          violations: [{
            rule: 'NO_DUPLICATE_SHIFTS',
            message: `Carer already scheduled on ${dayName} ${dayNumber}`,
            severity: 'error'
          }]
        })
      }

      // Validate the entry against other scheduling rules
      const entryToValidate = {
        ...data,
        date: new Date(data.date),
        isConfirmed: data.isConfirmed || false
      }

      const validationResult = await schedulingRulesEngine.validateRotaEntry(entryToValidate)

      // Remove any duplicate violations from backend
      const uniqueViolations = validationResult.violations.filter((violation, index, arr) => 
        index === arr.findIndex(v => v.message === violation.message && v.rule === violation.rule)
      )
      const uniqueWarnings = validationResult.warnings.filter((warning, index, arr) => 
        index === arr.findIndex(w => w.message === warning.message && w.rule === warning.rule)
      )

      // Allow creation even with violations - we'll return them as warnings
      // Only block if there are critical system errors (carer/package not found)
      const criticalErrors = uniqueViolations.filter(v => 
        v.rule === 'CARER_EXISTS' || v.rule === 'PACKAGE_EXISTS'
      )
      
      if (criticalErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Critical validation errors',
          violations: criticalErrors
        })
      }

      // Create the rota entry
      const rotaEntry = await prisma.rotaEntry.create({
        data: {
          packageId: data.packageId,
          carerId: data.carerId,
          date: new Date(data.date),
          shiftType: data.shiftType,
          startTime: data.startTime,
          endTime: data.endTime,
          isConfirmed: data.isConfirmed || false,
          createdByAdminId: adminId
        },
        include: {
          carer: {
            select: {
              id: true,
              name: true,
              email: true,
              competencyRatings: {
                include: { task: true }
              }
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              postcode: true
            }
          }
        }
      })

      res.status(201).json({
        success: true,
        data: rotaEntry,
        violations: uniqueViolations,
        warnings: uniqueWarnings,
        message: uniqueViolations.length > 0 
          ? 'Rota entry created with scheduling violations' 
          : 'Rota entry created successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Bulk create rota entries
   */
  async bulkCreateRotaEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      const { entries, validateOnly = false }: BulkCreateRotaRequest = req.body

      if (!entries || !Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Entries array is required and must not be empty'
        })
      }

      const validationResults: (ScheduleValidationResult & { index: number })[] = []
      interface ValidRotaEntry {
        packageId: string;
        carerId: string;
        date: Date;
        shiftType: ShiftType;
        startTime: string;
        endTime: string;
        isConfirmed: boolean;
        createdByAdminId: string;
      }
      
      const validEntries: ValidRotaEntry[] = []
      let hasErrors = false

      // Validate all entries first
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const entryToValidate = {
          ...entry,
          date: new Date(entry.date),
          isConfirmed: entry.isConfirmed || false
        }

        const validationResult = await schedulingRulesEngine.validateRotaEntry(entryToValidate)
        validationResults.push({ ...validationResult, index: i })

        if (!validationResult.isValid) {
          hasErrors = true
        } else {
          validEntries.push({
            packageId: entry.packageId,
            carerId: entry.carerId,
            date: new Date(entry.date),
            shiftType: entry.shiftType,
            startTime: entry.startTime,
            endTime: entry.endTime,
            isConfirmed: entry.isConfirmed || false,
            createdByAdminId: adminId
          })
        }
      }

      // If validation only, return results
      if (validateOnly) {
        return res.json({
          success: !hasErrors,
          data: {
            validationResults,
            validEntries: validEntries.length,
            totalEntries: entries.length
          }
        })
      }

      // If there are errors, don't create any entries
      if (hasErrors) {
        return res.status(400).json({
          success: false,
          error: 'Some entries have validation errors',
          validationResults
        })
      }

      // Create all valid entries in a transaction
      const createdEntries = await prisma.$transaction(async (tx) => {
        const created = []
        for (const entry of validEntries) {
          const rotaEntry = await tx.rotaEntry.create({
            data: entry,
            include: {
              carer: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              },
              package: {
                select: {
                  id: true,
                  name: true,
                  postcode: true
                }
              }
            }
          })
          created.push(rotaEntry)
        }
        return created
      })

      res.status(201).json({
        success: true,
        data: createdEntries,
        validationResults,
        message: `${createdEntries.length} rota entries created successfully`
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Update a rota entry
   */
  async updateRotaEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params
      const data: UpdateRotaEntryRequest = req.body

      // Get existing entry
      const existingEntry = await prisma.rotaEntry.findUnique({
        where: { id }
      })

      if (!existingEntry) {
        return res.status(404).json({
          success: false,
          error: 'Rota entry not found'
        })
      }

      // Prepare updated entry for validation
      const updatedEntry = {
        packageId: data.packageId || existingEntry.packageId,
        carerId: data.carerId || existingEntry.carerId,
        date: data.date ? new Date(data.date) : existingEntry.date,
        shiftType: convertShiftType(data.shiftType || existingEntry.shiftType),
        startTime: data.startTime || existingEntry.startTime,
        endTime: data.endTime || existingEntry.endTime,
        isConfirmed: data.isConfirmed !== undefined ? data.isConfirmed : existingEntry.isConfirmed
      }

      // Validate the updated entry
      const validationResult = await schedulingRulesEngine.validateRotaEntry(updatedEntry)

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Scheduling rule violations',
          violations: validationResult.violations,
          warnings: validationResult.warnings
        })
      }

      // Update the entry
      const rotaEntry = await prisma.rotaEntry.update({
        where: { id },
        data: {
          ...(data.packageId && { packageId: data.packageId }),
          ...(data.carerId && { carerId: data.carerId }),
          ...(data.date && { date: new Date(data.date) }),
          ...(data.shiftType && { shiftType: data.shiftType }),
          ...(data.startTime && { startTime: data.startTime }),
          ...(data.endTime && { endTime: data.endTime }),
          ...(data.isConfirmed !== undefined && { isConfirmed: data.isConfirmed })
        },
        include: {
          carer: {
            select: {
              id: true,
              name: true,
              email: true,
              competencyRatings: {
                include: { task: true }
              }
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              postcode: true
            }
          }
        }
      })

      res.json({
        success: true,
        data: rotaEntry,
        warnings: validationResult.warnings,
        message: 'Rota entry updated successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Batch delete rota entries
   */
  async batchDeleteRotaEntries(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids }: BatchDeleteRotaRequest = req.body

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'IDs array is required and must not be empty'
        })
      }

      // Validate all IDs exist and get their details for audit
      const existingEntries = await prisma.rotaEntry.findMany({
        where: {
          id: {
            in: ids
          }
        },
        select: {
          id: true,
          packageId: true,
          carerId: true,
          date: true,
          shiftType: true,
          carer: {
            select: { name: true }
          },
          package: {
            select: { name: true }
          }
        }
      })

      const foundIds = existingEntries.map(entry => entry.id)
      const notFoundIds = ids.filter(id => !foundIds.includes(id))

      if (notFoundIds.length > 0) {
        return res.status(400).json({
          success: false,
          error: `Rota entries not found: ${notFoundIds.join(', ')}`,
          notFoundIds
        })
      }

      // Perform batch delete in a transaction
      const deleteResult = await prisma.$transaction(async (tx) => {
        const deleteCount = await tx.rotaEntry.deleteMany({
          where: {
            id: {
              in: ids
            }
          }
        })
        
        return {
          deletedCount: deleteCount.count,
          deletedEntries: existingEntries
        }
      })

      res.json({
        success: true,
        data: {
          deletedCount: deleteResult.deletedCount,
          deletedEntries: deleteResult.deletedEntries.map(entry => ({
            id: entry.id,
            carerName: entry.carer.name,
            packageName: entry.package.name,
            date: entry.date,
            shiftType: entry.shiftType
          }))
        },
        message: `Successfully deleted ${deleteResult.deletedCount} rota ${deleteResult.deletedCount === 1 ? 'entry' : 'entries'}`
      })
    } catch (error) {
      console.error('Error in batchDeleteRotaEntries:', error)
      next(error)
    }
  }

  /**
   * Delete a rota entry
   */
  async deleteRotaEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const existingEntry = await prisma.rotaEntry.findUnique({
        where: { id }
      })

      if (!existingEntry) {
        return res.status(404).json({
          success: false,
          error: 'Rota entry not found'
        })
      }

      await prisma.rotaEntry.delete({
        where: { id }
      })

      res.json({
        success: true,
        data: null,
        message: 'Rota entry deleted successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Validate a rota entry without creating it
   */
  async validateRotaEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const data: CreateRotaEntryRequest = req.body

      if (!data.packageId || !data.carerId || !data.date || !data.shiftType || !data.startTime || !data.endTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: packageId, carerId, date, shiftType, startTime, endTime'
        })
      }

      const entryToValidate = {
        ...data,
        date: new Date(data.date),
        isConfirmed: data.isConfirmed || false
      }

      const validationResult = await schedulingRulesEngine.validateRotaEntry(entryToValidate)

      res.json({
        success: validationResult.isValid,
        data: validationResult,
        message: validationResult.isValid ? 'Entry is valid' : 'Entry has validation issues'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Get rota entry by ID
   */
  async getRotaEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const rotaEntry = await prisma.rotaEntry.findUnique({
        where: { id },
        include: {
          carer: {
            include: {
              competencyRatings: {
                include: { task: true }
              }
            }
          },
          package: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      })

      if (!rotaEntry) {
        return res.status(404).json({
          success: false,
          error: 'Rota entry not found'
        })
      }

      res.json({
        success: true,
        data: rotaEntry
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Confirm a rota entry
   */
  async confirmRotaEntry(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params

      const rotaEntry = await prisma.rotaEntry.update({
        where: { id },
        data: { isConfirmed: true },
        include: {
          carer: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          package: {
            select: {
              id: true,
              name: true,
              postcode: true
            }
          }
        }
      })

      res.json({
        success: true,
        data: rotaEntry,
        message: 'Rota entry confirmed successfully'
      })
    } catch (error) {
      next(error)
    }
  }

  /**
   * Export weekly rota to Excel
   */
  async exportWeeklyRotaToExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId, weekStart } = req.query

      if (!packageId || !weekStart) {
        return res.status(400).json({
          success: false,
          error: 'Package ID and week start date are required'
        })
      }

      const weekStartDate = new Date(weekStart as string)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 7)

      // Get package details
      const carePackage = await prisma.carePackage.findUnique({
        where: { id: packageId as string },
        select: { id: true, name: true, postcode: true }
      })

      if (!carePackage) {
        return res.status(404).json({
          success: false,
          error: 'Care package not found'
        })
      }

      // Get weekly entries
      const weekEntries = await prisma.rotaEntry.findMany({
        where: {
          packageId: packageId as string,
          date: { gte: weekStartDate, lt: weekEndDate }
        },
        include: {
          carer: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, name: true, postcode: true } }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      })

      // Generate Excel workbook
      const workbook = await this.generateExcelRota(carePackage, weekStartDate, weekEntries)

      // Set response headers for Excel download
      const filename = `rota_${carePackage.name.replace(/\s+/g, '_')}_${weekStartDate.toISOString().split('T')[0]}.xlsx`
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

      // Stream the Excel file
      await workbook.xlsx.write(res)
      res.end()
    } catch (error) {
      console.error('Error exporting rota to Excel:', error)
      next(error)
    }
  }

  /**
   * Email weekly rota to stakeholders
   */
  async emailWeeklyRota(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId, weekStart, recipients, includeAttachment = true } = req.body

      if (!packageId || !weekStart || !recipients || !Array.isArray(recipients)) {
        return res.status(400).json({
          success: false,
          error: 'Package ID, week start date, and recipients array are required'
        })
      }

      const weekStartDate = new Date(weekStart)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 7)

      // Get package and entries data
      const carePackage = await prisma.carePackage.findUnique({
        where: { id: packageId },
        select: { id: true, name: true, postcode: true }
      })

      if (!carePackage) {
        return res.status(404).json({
          success: false,
          error: 'Care package not found'
        })
      }

      const weekEntries = await prisma.rotaEntry.findMany({
        where: {
          packageId: packageId,
          date: { gte: weekStartDate, lt: weekEndDate }
        },
        include: {
          carer: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, name: true, postcode: true } }
        },
        orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
      })

      // Generate email content
      const emailContent = this.generateRotaEmailContent(carePackage, weekStartDate, weekEntries)
      
      let attachmentBuffer: Buffer | undefined
      if (includeAttachment) {
        const workbook = await this.generateExcelRota(carePackage, weekStartDate, weekEntries)
        attachmentBuffer = await workbook.xlsx.writeBuffer() as Buffer
      }

      // TODO: Integrate with actual email service (SendGrid, AWS SES, etc.)
      // For now, we'll return the email content and indicate success
      const emailData = {
        recipients,
        subject: `Weekly Rota - ${carePackage.name} (${weekStartDate.toLocaleDateString()})`,
        html: emailContent,
        attachment: includeAttachment ? {
          filename: `rota_${carePackage.name.replace(/\s+/g, '_')}_${weekStartDate.toISOString().split('T')[0]}.xlsx`,
          content: attachmentBuffer?.toString('base64')
        } : undefined
      }

      // Here you would typically queue the email or send it directly
      // await emailService.sendEmail(emailData)

      res.json({
        success: true,
        data: {
          emailPreview: emailContent,
          recipientCount: recipients.length,
          hasAttachment: includeAttachment,
          packageName: carePackage.name,
          weekRange: `${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}`
        },
        message: `Rota email prepared for ${recipients.length} recipient(s)`
      })
    } catch (error) {
      console.error('Error preparing rota email:', error)
      next(error)
    }
  }

  /**
   * Archive weekly rota
   */
  async archiveWeeklyRota(req: Request, res: Response, next: NextFunction) {
    try {
      const { packageId, weekStart, archiveReason = 'Manual archive' } = req.body

      if (!packageId || !weekStart) {
        return res.status(400).json({
          success: false,
          error: 'Package ID and week start date are required'
        })
      }

      const weekStartDate = new Date(weekStart)
      const weekEndDate = new Date(weekStartDate)
      weekEndDate.setDate(weekEndDate.getDate() + 7)

      // Get entries to archive
      const weekEntries = await prisma.rotaEntry.findMany({
        where: {
          packageId: packageId,
          date: { gte: weekStartDate, lt: weekEndDate }
        },
        include: {
          carer: { select: { id: true, name: true, email: true } },
          package: { select: { id: true, name: true, postcode: true } }
        }
      })

      if (weekEntries.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No rota entries found for the specified week'
        })
      }

      // Create archive record
      const archiveData = {
        packageId,
        weekStart: weekStartDate,
        weekEnd: weekEndDate,
        totalEntries: weekEntries.length,
        entriesData: JSON.stringify(weekEntries),
        archiveReason,
        archivedAt: new Date(),
        archivedBy: req.user?.id
      }

      // TODO: Create actual archive table and record
      // For now, we'll simulate the archive process
      const archiveResult = {
        archiveId: `archive_${Date.now()}`,
        ...archiveData
      }

      res.json({
        success: true,
        data: {
          archiveId: archiveResult.archiveId,
          packageName: weekEntries[0].package.name,
          weekRange: `${weekStartDate.toLocaleDateString()} - ${weekEndDate.toLocaleDateString()}`,
          totalEntries: weekEntries.length,
          archiveReason,
          archivedAt: new Date()
        },
        message: `Successfully archived ${weekEntries.length} rota entries`
      })
    } catch (error) {
      console.error('Error archiving rota:', error)
      next(error)
    }
  }

  /**
   * Generate Excel workbook for rota data
   */
  private async generateExcelRota(
    carePackage: { id: string; name: string; postcode: string },
    weekStart: Date,
    entries: any[]
  ): Promise<ExcelJS.Workbook> {
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet('Weekly Rota')

    // Set up workbook metadata
    workbook.creator = 'CareTrack Pro'
    workbook.lastModifiedBy = 'CareTrack Pro'
    workbook.created = new Date()
    workbook.modified = new Date()

    // Title and header information
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    worksheet.mergeCells('A1:H1')
    worksheet.getCell('A1').value = `Weekly Rota - ${carePackage.name}`
    worksheet.getCell('A1').font = { size: 16, bold: true }
    worksheet.getCell('A1').alignment = { horizontal: 'center' }

    worksheet.mergeCells('A2:H2')
    worksheet.getCell('A2').value = `Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}`
    worksheet.getCell('A2').font = { size: 12 }
    worksheet.getCell('A2').alignment = { horizontal: 'center' }

    worksheet.mergeCells('A3:H3')
    worksheet.getCell('A3').value = `Postcode: ${carePackage.postcode}`
    worksheet.getCell('A3').font = { size: 10 }
    worksheet.getCell('A3').alignment = { horizontal: 'center' }

    // Headers
    const headers = ['Date', 'Day', 'Shift Type', 'Start Time', 'End Time', 'Carer Name', 'Email', 'Status']
    const headerRow = worksheet.addRow(headers)
    headerRow.eachCell((cell) => {
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6E6FA' } }
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      }
    })

    // Data rows
    for (const entry of entries) {
      const date = new Date(entry.date)
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
      
      const row = worksheet.addRow([
        date.toLocaleDateString(),
        dayName,
        entry.shiftType,
        entry.startTime,
        entry.endTime,
        entry.carer.name,
        entry.carer.email,
        entry.isConfirmed ? 'Confirmed' : 'Pending'
      ])

      // Apply styling
      row.eachCell((cell, colNumber) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        }

        // Color code by shift type
        if (colNumber === 3) { // Shift Type column
          if (entry.shiftType === 'DAY') {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF8DC' } }
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F3FF' } }
          }
        }

        // Color code by status
        if (colNumber === 8) { // Status column
          if (entry.isConfirmed) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFE6' } }
          } else {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEEE6' } }
          }
        }
      })
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0
      column.eachCell?.({ includeEmpty: true }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10
        if (columnLength > maxLength) {
          maxLength = columnLength
        }
      })
      column.width = Math.min(maxLength + 2, 50)
    })

    // Summary section
    const summaryStartRow = entries.length + 7
    worksheet.getCell(`A${summaryStartRow}`).value = 'Summary:'
    worksheet.getCell(`A${summaryStartRow}`).font = { bold: true }

    const totalShifts = entries.length
    const confirmedShifts = entries.filter(e => e.isConfirmed).length
    const dayShifts = entries.filter(e => e.shiftType === 'DAY').length
    const nightShifts = entries.filter(e => e.shiftType === 'NIGHT').length

    worksheet.getCell(`A${summaryStartRow + 1}`).value = `Total Shifts: ${totalShifts}`
    worksheet.getCell(`A${summaryStartRow + 2}`).value = `Confirmed Shifts: ${confirmedShifts}`
    worksheet.getCell(`A${summaryStartRow + 3}`).value = `Day Shifts: ${dayShifts}`
    worksheet.getCell(`A${summaryStartRow + 4}`).value = `Night Shifts: ${nightShifts}`

    return workbook
  }

  /**
   * Generate HTML email content for rota
   */
  private generateRotaEmailContent(
    carePackage: { id: string; name: string; postcode: string },
    weekStart: Date,
    entries: any[]
  ): string {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)

    let html = `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <h2 style="color: #1976d2; text-align: center;">Weekly Rota</h2>
      <h3 style="text-align: center;">${carePackage.name}</h3>
      <p style="text-align: center; color: #666;">
        Week: ${weekStart.toLocaleDateString()} - ${weekEnd.toLocaleDateString()}<br>
        Postcode: ${carePackage.postcode}
      </p>
      
      <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
        <thead>
          <tr style="background-color: #f5f5f5;">
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Date</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Day</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Shift</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Time</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Carer</th>
            <th style="border: 1px solid #ddd; padding: 12px; text-align: left;">Status</th>
          </tr>
        </thead>
        <tbody>`

    entries.forEach(entry => {
      const date = new Date(entry.date)
      const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
      const statusColor = entry.isConfirmed ? '#4caf50' : '#ff9800'
      const shiftColor = entry.shiftType === 'DAY' ? '#fff3e0' : '#e3f2fd'

      html += `
          <tr style="background-color: ${shiftColor};">
            <td style="border: 1px solid #ddd; padding: 8px;">${date.toLocaleDateString()}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${dayName}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${entry.shiftType}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${entry.startTime} - ${entry.endTime}</td>
            <td style="border: 1px solid #ddd; padding: 8px;">${entry.carer.name}</td>
            <td style="border: 1px solid #ddd; padding: 8px; color: ${statusColor}; font-weight: bold;">
              ${entry.isConfirmed ? 'Confirmed' : 'Pending'}
            </td>
          </tr>`
    })

    const totalShifts = entries.length
    const confirmedShifts = entries.filter(e => e.isConfirmed).length
    const confirmationRate = totalShifts > 0 ? Math.round((confirmedShifts / totalShifts) * 100) : 0

    html += `
        </tbody>
      </table>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h4 style="margin: 0 0 10px 0; color: #333;">Summary</h4>
        <p style="margin: 5px 0;">Total Shifts: <strong>${totalShifts}</strong></p>
        <p style="margin: 5px 0;">Confirmed Shifts: <strong>${confirmedShifts}</strong></p>
        <p style="margin: 5px 0;">Confirmation Rate: <strong>${confirmationRate}%</strong></p>
      </div>
      
      <p style="color: #666; font-size: 12px; text-align: center; margin-top: 30px;">
        Generated by CareTrack Pro on ${new Date().toLocaleString()}
      </p>
    </div>`

    return html
  }
}

export const rotaController = new RotaController()