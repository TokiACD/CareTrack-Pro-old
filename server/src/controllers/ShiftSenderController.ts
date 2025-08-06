import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { ShiftStatus, ShiftApplicationStatus, ShiftType, CompetencyLevel } from '@caretrack/shared'
import { availabilityService, AvailabilityCheck } from '../services/availabilityService'
import { emailService } from '../services/emailService'

const prisma = new PrismaClient()

export interface CreateShiftRequest {
  packageId: string
  date: string // ISO date string
  startTime: string // HH:MM format
  endTime: string // HH:MM format
  requiredCompetencies: string[] // Task IDs
  isCompetentOnly: boolean
  expiresAt?: string // ISO date string
}

export interface ShiftWithAvailability {
  shift: any
  availableCarers: AvailabilityCheck[]
  totalAvailable: number
  competentCarers: number
}

export interface SelectCarerRequest {
  shiftId: string
  carerId: string
  notes?: string
}

export class ShiftSenderController {
  /**
   * Create a new shift and get available carers
   */
  async createShift(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }
      
      const data: CreateShiftRequest = req.body

      // Validate package exists
      const carePackage = await prisma.carePackage.findUnique({
        where: { id: data.packageId, deletedAt: null }
      })

      if (!carePackage) {
        return res.status(404).json({
          success: false,
          error: 'Care package not found'
        })
      }

      // Parse dates
      const shiftDate = new Date(data.date)
      const expiresAt = data.expiresAt ? new Date(data.expiresAt) : new Date(Date.now() + 48 * 60 * 60 * 1000) // Default 48 hours

      // Determine shift type based on start time
      const shiftType = this.determineShiftType(data.startTime)

      // Create shift
      const shift = await prisma.shift.create({
        data: {
          packageId: data.packageId,
          date: shiftDate,
          startTime: data.startTime,
          endTime: data.endTime,
          requiredCompetencies: data.requiredCompetencies,
          isCompetentOnly: data.isCompetentOnly,
          status: ShiftStatus.PENDING,
          expiresAt,
          createdByAdminId: adminId
        },
        include: {
          package: true,
          createdBy: true
        }
      })

      // Get available carers
      const availableCarers = data.isCompetentOnly
        ? await availabilityService.getCompetentCarersForShift(
            shiftDate,
            data.startTime,
            data.endTime,
            data.packageId,
            data.requiredCompetencies,
            shiftType
          )
        : await availabilityService.getAvailableCarersForNonCompetentShift(
            shiftDate,
            data.startTime,
            data.endTime,
            data.packageId,
            shiftType
          )

      const result: ShiftWithAvailability = {
        shift,
        availableCarers,
        totalAvailable: availableCarers.filter(c => c.isAvailable).length,
        competentCarers: availableCarers.filter(c => 
          c.competencyMatch.isCompetent && c.isAvailable
        ).length
      }

      res.status(201).json({
        success: true,
        data: result,
        message: 'Shift created successfully'
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Send shift to selected carers
   */
  async sendShiftToCarers(req: Request, res: Response, next: NextFunction) {
    try {
      const { shiftId } = req.params
      const { carerIds, sendEmail = true } = req.body

      // Get shift details
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          package: true,
          createdBy: true
        }
      })

      if (!shift) {
        return res.status(404).json({
          success: false,
          error: 'Shift not found'
        })
      }

      if (shift.status !== ShiftStatus.PENDING) {
        return res.status(400).json({
          success: false,
          error: 'Shift has already been sent or is not in pending status'
        })
      }

      // Get carer details
      const carers = await prisma.carer.findMany({
        where: {
          id: { in: carerIds },
          deletedAt: null,
          isActive: true
        }
      })

      if (carers.length !== carerIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Some selected carers were not found or are inactive'
        })
      }

      // Create shift assignments for selected carers
      await prisma.shiftAssignment.createMany({
        data: carers.map(carer => ({
          shiftId,
          carerId: carer.id,
          status: ShiftStatus.WAITING_RESPONSES
        }))
      })

      // Update shift status
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: ShiftStatus.WAITING_RESPONSES }
      })

      // Send notifications if requested
      if (sendEmail) {
        await this.sendShiftNotifications(shift, carers)
      }

      res.json({
        success: true,
        data: {
          shiftId,
          sentToCarers: carers.length,
          carerNames: carers.map(c => c.name)
        },
        message: `Shift sent to ${carers.length} carers successfully`
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get carers who have applied for a shift
   */
  async getShiftApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { shiftId } = req.params

      const applications = await prisma.shiftApplication.findMany({
        where: { shiftId },
        include: {
          carer: {
            include: {
              competencyRatings: {
                include: {
                  task: true
                }
              }
            }
          }
        },
        orderBy: { appliedAt: 'asc' }
      })

      // Get shift details
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          package: true
        }
      })

      if (!shift) {
        return res.status(404).json({
          success: false,
          error: 'Shift not found'
        })
      }

      res.json({
        success: true,
        data: {
          shift,
          applications,
          totalApplications: applications.length,
          pendingApplications: applications.filter(a => a.status === ShiftApplicationStatus.PENDING).length
        }
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Select a carer for a shift
   */
  async selectCarerForShift(req: Request, res: Response, next: NextFunction) {
    try {
      const data: SelectCarerRequest = req.body
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Get shift and application
        const shift = await tx.shift.findUnique({
          where: { id: data.shiftId },
          include: { package: true }
        })

        if (!shift) {
          throw new Error('Shift not found')
        }

        const application = await tx.shiftApplication.findUnique({
          where: {
            shiftId_carerId: {
              shiftId: data.shiftId,
              carerId: data.carerId
            }
          },
          include: { carer: true }
        })

        if (!application) {
          throw new Error('Application not found')
        }

        if (application.status !== ShiftApplicationStatus.PENDING) {
          throw new Error('Application is no longer pending')
        }

        // Update selected application
        await tx.shiftApplication.update({
          where: { id: application.id },
          data: { status: ShiftApplicationStatus.SELECTED }
        })

        // Reject all other applications
        await tx.shiftApplication.updateMany({
          where: {
            shiftId: data.shiftId,
            carerId: { not: data.carerId }
          },
          data: { status: ShiftApplicationStatus.REJECTED }
        })

        // Update shift
        await tx.shift.update({
          where: { id: data.shiftId },
          data: {
            selectedCarerId: data.carerId,
            status: ShiftStatus.ASSIGNED
          }
        })

        // Create rota entry
        const rotaEntry = await tx.rotaEntry.create({
          data: {
            packageId: shift.packageId,
            carerId: data.carerId,
            date: shift.date,
            shiftType: this.determineShiftType(shift.startTime),
            startTime: shift.startTime,
            endTime: shift.endTime,
            isConfirmed: false,
            createdByAdminId: adminId
          }
        })

        // Update shift with rota entry link
        await tx.shift.update({
          where: { id: data.shiftId },
          data: { rotaEntryId: rotaEntry.id }
        })

        return { shift, application, rotaEntry }
      })

      // Send notifications
      await this.sendSelectionNotifications(result.shift, result.application.carer, true)
      
      // Send rejection notifications to other applicants
      const rejectedApplications = await prisma.shiftApplication.findMany({
        where: {
          shiftId: data.shiftId,
          status: ShiftApplicationStatus.REJECTED
        },
        include: { carer: true }
      })

      for (const rejectedApp of rejectedApplications) {
        await this.sendSelectionNotifications(result.shift, rejectedApp.carer, false)
      }

      res.json({
        success: true,
        data: {
          selectedCarer: result.application.carer.name,
          rotaEntryId: result.rotaEntry.id,
          rejectedApplications: rejectedApplications.length
        },
        message: 'Carer selected successfully and added to rota'
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get shifts sent by admin (for shifts sent management)
   */
  async getSentShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }
      const page = parseInt(req.query.page as string) || 1
      const limit = parseInt(req.query.limit as string) || 20
      const status = req.query.status as string
      const skip = (page - 1) * limit

      const where: any = {
        createdByAdminId: adminId
      }

      if (status) {
        where.status = status
      }

      const [shifts, total] = await Promise.all([
        prisma.shift.findMany({
          where,
          include: {
            package: true,
            applications: {
              include: { carer: true }
            },
            selectedCarer: true
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit
        }),
        prisma.shift.count({ where })
      ])

      const shiftsWithCounts = shifts.map(shift => ({
        ...shift,
        applicationCount: shift.applications.length,
        pendingApplications: shift.applications.filter(a => a.status === ShiftApplicationStatus.PENDING).length
      }))

      res.json({
        success: true,
        data: shiftsWithCounts,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Check availability for shift creation (preview)
   */
  async checkAvailability(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        packageId,
        date,
        startTime,
        endTime,
        requiredCompetencies = '',
        isCompetentOnly = 'false'
      } = req.query

      // Validate required parameters
      if (!packageId || !date || !startTime || !endTime) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameters: packageId, date, startTime, endTime'
        })
      }

      const shiftDate = new Date(date as string)
      const shiftType = this.determineShiftType(startTime as string)

      // Parse required competencies safely
      const requiredCompetenciesArray = requiredCompetencies && typeof requiredCompetencies === 'string' 
        ? requiredCompetencies.split(',').filter(Boolean)
        : []

      const availableCarers = isCompetentOnly === 'true'
        ? await availabilityService.getCompetentCarersForShift(
            shiftDate,
            startTime as string,
            endTime as string,
            packageId as string,
            requiredCompetenciesArray,
            shiftType
          )
        : await availabilityService.getAvailableCarersForNonCompetentShift(
            shiftDate,
            startTime as string,
            endTime as string,
            packageId as string,
            shiftType
          )

      // Ensure availableCarers is an array and has the expected structure
      if (!Array.isArray(availableCarers)) {
        console.error('availableCarers is not an array:', availableCarers)
        return res.status(500).json({
          success: false,
          error: 'Invalid availability service response'
        })
      }

      // Get full carer details - handle empty array case
      const carerIds = availableCarers.map(c => c.carerId).filter(Boolean)
      let carers = []
      
      if (carerIds.length > 0) {
        carers = await prisma.carer.findMany({
          where: { 
            id: { in: carerIds },
            deletedAt: null,
            isActive: true
          },
          include: {
            competencyRatings: {
              include: { task: true }
            }
          }
        })
      }

      const carersWithAvailability = carers.map(carer => {
        const availability = availableCarers.find(a => a.carerId === carer.id)
        return {
          ...carer,
          availability
        }
      })

      res.json({
        success: true,
        data: {
          availableCarers: carersWithAvailability,
          totalCarers: carersWithAvailability.length,
          availableCount: availableCarers.filter(c => c.isAvailable).length,
          competentCount: availableCarers.filter(c => 
            c.competencyMatch && c.competencyMatch.isCompetent && c.isAvailable
          ).length
        }
      })

    } catch (error) {
      console.error('Error in checkAvailability:', error)
      next(error)
    }
  }

  /**
   * Determine shift type based on start time
   */
  private determineShiftType(startTime: string): ShiftType {
    const hour = parseInt(startTime.split(':')[0])
    return (hour >= 6 && hour < 19) ? ShiftType.DAY : ShiftType.NIGHT
  }

  /**
   * Send shift notifications to carers
   */
  private async sendShiftNotifications(shift: any, carers: any[]) {
    // In a real implementation, you would send emails to carers
    // about available shifts via the carer mobile app
    console.log(`Sending shift notifications to ${carers.length} carers for shift on ${shift.date}`)
    
    // This would integrate with push notifications or email system
    // for the carer mobile app (yet to be implemented)
  }

  /**
   * Delete a shift
   */
  async deleteShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { shiftId } = req.params
      const adminId = req.user?.id
      if (!adminId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required'
        })
      }

      // Check if shift exists and belongs to current admin
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId },
        include: {
          applications: true,
          assignments: true
        }
      })

      if (!shift) {
        return res.status(404).json({
          success: false,
          error: 'Shift not found'
        })
      }

      if (shift.createdByAdminId !== adminId) {
        return res.status(403).json({
          success: false,
          error: 'You can only delete shifts you created'
        })
      }

      // Don't allow deletion of assigned/confirmed shifts
      if (shift.status === 'ASSIGNED' || shift.status === 'CONFIRMED' || shift.status === 'COMPLETED') {
        return res.status(400).json({
          success: false,
          error: 'Cannot delete shifts that have been assigned or completed'
        })
      }

      // Delete in transaction to clean up related records
      await prisma.$transaction(async (tx) => {
        // Delete applications
        await tx.shiftApplication.deleteMany({
          where: { shiftId }
        })

        // Delete assignments
        await tx.shiftAssignment.deleteMany({
          where: { shiftId }
        })

        // Delete the shift
        await tx.shift.delete({
          where: { id: shiftId }
        })
      })

      res.json({
        success: true,
        message: 'Shift deleted successfully'
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Send selection notifications
   */
  private async sendSelectionNotifications(shift: any, carer: any, isSelected: boolean) {
    // In a real implementation, you would notify the carer
    // whether they were selected or not
    console.log(`Notifying ${carer.name}: ${isSelected ? 'Selected' : 'Not selected'} for shift on ${shift.date}`)
    
    // This would integrate with push notifications for the carer mobile app
  }
}

export const shiftSenderController = new ShiftSenderController()