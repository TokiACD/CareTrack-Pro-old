import { Request, Response, NextFunction } from 'express'
import { PrismaClient } from '@prisma/client'
import { ShiftApplicationStatus } from '@caretrack/shared'

const prisma = new PrismaClient()

// This controller simulates carer mobile app actions for testing
export class CarerShiftController {
  /**
   * Apply for a shift (simulates carer mobile app action)
   */
  async applyForShift(req: Request, res: Response, next: NextFunction) {
    try {
      const { shiftId, carerId, notes } = req.body

      // Validate shift exists and is accepting applications
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId }
      })

      if (!shift) {
        return res.status(404).json({
          success: false,
          error: 'Shift not found'
        })
      }

      if (shift.status !== 'WAITING_RESPONSES') {
        return res.status(400).json({
          success: false,
          error: 'Shift is not accepting applications'
        })
      }

      // Check if carer already applied
      const existingApplication = await prisma.shiftApplication.findUnique({
        where: {
          shiftId_carerId: {
            shiftId,
            carerId
          }
        }
      })

      if (existingApplication) {
        return res.status(400).json({
          success: false,
          error: 'Carer has already applied for this shift'
        })
      }

      // Create application
      const application = await prisma.shiftApplication.create({
        data: {
          shiftId,
          carerId,
          status: ShiftApplicationStatus.PENDING,
          notes: notes || null
        },
        include: {
          carer: true,
          shift: {
            include: {
              package: true
            }
          }
        }
      })

      // Update shift status to HAS_APPLICATIONS
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'HAS_APPLICATIONS' }
      })

      res.json({
        success: true,
        data: application,
        message: 'Application submitted successfully'
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get available shifts for a carer (simulates carer mobile app)
   */
  async getAvailableShifts(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.params

      // Get shifts that are waiting for responses and haven't expired
      const shifts = await prisma.shift.findMany({
        where: {
          status: 'WAITING_RESPONSES',
          expiresAt: {
            gt: new Date()
          },
          // Exclude shifts the carer has already applied for
          applications: {
            none: {
              carerId: carerId
            }
          }
        },
        include: {
          package: true,
          applications: {
            include: {
              carer: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      res.json({
        success: true,
        data: shifts
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Get carer's shift applications
   */
  async getCarerApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { carerId } = req.params

      const applications = await prisma.shiftApplication.findMany({
        where: { carerId },
        include: {
          shift: {
            include: {
              package: true
            }
          }
        },
        orderBy: { appliedAt: 'desc' }
      })

      res.json({
        success: true,
        data: applications
      })

    } catch (error) {
      next(error)
    }
  }

  /**
   * Test endpoint to simulate multiple carer applications for a shift
   */
  async simulateApplications(req: Request, res: Response, next: NextFunction) {
    try {
      const { shiftId } = req.params
      const { carerIds } = req.body

      if (!Array.isArray(carerIds) || carerIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'carerIds must be a non-empty array'
        })
      }

      // Validate shift exists
      const shift = await prisma.shift.findUnique({
        where: { id: shiftId }
      })

      if (!shift) {
        return res.status(404).json({
          success: false,
          error: 'Shift not found'
        })
      }

      // Create applications for all carers
      const applications = await Promise.all(
        carerIds.map(async (carerId: string) => {
          // Check if application already exists
          const existing = await prisma.shiftApplication.findUnique({
            where: {
              shiftId_carerId: {
                shiftId,
                carerId
              }
            }
          })

          if (existing) {
            return existing
          }

          return prisma.shiftApplication.create({
            data: {
              shiftId,
              carerId,
              status: ShiftApplicationStatus.PENDING,
              notes: `Test application from carer ${carerId}`
            },
            include: {
              carer: true
            }
          })
        })
      )

      // Update shift status to HAS_APPLICATIONS
      await prisma.shift.update({
        where: { id: shiftId },
        data: { status: 'HAS_APPLICATIONS' }
      })

      res.json({
        success: true,
        data: applications,
        message: `Simulated ${applications.length} applications for shift`
      })

    } catch (error) {
      next(error)
    }
  }
}

export const carerShiftController = new CarerShiftController()