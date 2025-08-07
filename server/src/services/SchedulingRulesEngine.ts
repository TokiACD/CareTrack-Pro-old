import { PrismaClient } from '@prisma/client'
import { ShiftType, CompetencyLevel, RotaEntry } from '@caretrack/shared'
import { SCHEDULING_RULES } from '@caretrack/shared'

const prisma = new PrismaClient()

export interface RuleViolation {
  rule: string
  message: string
  severity: 'error' | 'warning'
  carerId?: string
  carerName?: string
  additionalInfo?: Record<string, any>
}

export interface ScheduleValidationResult {
  isValid: boolean
  violations: RuleViolation[]
  warnings: RuleViolation[]
}

export interface WeeklySchedule {
  carerId: string
  carerName: string
  entries: RotaEntry[]
  totalHours: number
  dayShifts: number
  nightShifts: number
  violations: RuleViolation[]
}


export class SchedulingRulesEngine {
  /**
   * Validate a single rota entry against all scheduling rules
   */
  async validateRotaEntry(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    existingEntries?: RotaEntry[]
  ): Promise<ScheduleValidationResult> {
    const violations: RuleViolation[] = []

    try {
      // Get existing entries if not provided
      if (!existingEntries) {
        existingEntries = await this.getExistingEntries(entry.packageId)
      }

      // Get carer information
      const carer = await prisma.carer.findUnique({
        where: { id: entry.carerId },
        include: {
          competencyRatings: {
            include: { task: true }
          }
        }
      })

      if (!carer) {
        violations.push({
          rule: 'CARER_EXISTS',
          message: 'Carer not found',
          severity: 'error',
          carerId: entry.carerId
        })
        return { isValid: false, violations, warnings: [] }
      }

      // Rule 1: Minimum staffing - 1 competent staff member at all times
      const staffingViolation = await this.validateMinimumStaffing(entry, existingEntries)
      if (staffingViolation) violations.push(staffingViolation)

      // Rule 2: Competency pairing - Non-comp can only work with comp
      const competencyViolation = await this.validateCompetencyPairing(entry, existingEntries, carer)
      if (competencyViolation) violations.push(competencyViolation)

      // Rule 3: Weekly hours - 36-hour maximum per carer per week
      const weeklyHoursViolation = await this.validateWeeklyHours(entry, carer.name)
      if (weeklyHoursViolation) violations.push(weeklyHoursViolation)

      // Rule 4: Rotation pattern - 1 week days → 1 week nights
      const rotationViolation = await this.validateRotationPattern(entry, carer.name)
      if (rotationViolation) violations.push(rotationViolation)

      // Rule 5: Weekend restriction - No consecutive weekends
      const weekendViolation = await this.validateConsecutiveWeekends(entry, carer.name)
      if (weekendViolation) violations.push(weekendViolation)

      // Rule 6: Night shift flexibility - Consecutive nights allowed (no violation)
      // This rule is permissive, so no validation needed

      // Rule 7: Rest periods - No night→day shifts in same week unless 2+ days rest
      const restPeriodViolation = await this.validateRestPeriods(entry, carer.name)
      if (restPeriodViolation) violations.push(restPeriodViolation)

      // Rule 8: Day→night flexibility - Day→night allowed same week (no violation)
      // This rule is permissive, so no validation needed

      // Rule 9: No duplicate shifts - Handled separately in controller before validation
      // This avoids confusion with other validation rules

      const warnings = violations.filter(v => v.severity === 'warning')
      const errors = violations.filter(v => v.severity === 'error')

      return {
        isValid: errors.length === 0,
        violations: errors,
        warnings
      }
    } catch (error) {
      console.error('Error validating rota entry:', error)
      violations.push({
        rule: 'VALIDATION_ERROR',
        message: 'Error occurred during validation',
        severity: 'error'
      })

      return { isValid: false, violations, warnings: [] }
    }
  }

  /**
   * Validate multiple rota entries (bulk validation)
   */
  async validateWeeklySchedule(
    packageId: string,
    weekStart: Date
  ): Promise<WeeklySchedule[]> {
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Get all rota entries for the week
    const weekEntries = await prisma.rotaEntry.findMany({
      where: {
        packageId,
        date: {
          gte: weekStart,
          lt: weekEnd
        }
      },
      include: {
        carer: true,
        package: true
      }
    })

    // Group entries by carer
    const carerSchedules = new Map<string, WeeklySchedule>()

    for (const entry of weekEntries) {
      const carerId = entry.carerId
      if (!carerSchedules.has(carerId)) {
        carerSchedules.set(carerId, {
          carerId,
          carerName: entry.carer.name,
          entries: [],
          totalHours: 0,
          dayShifts: 0,
          nightShifts: 0,
          violations: []
        })
      }

      const schedule = carerSchedules.get(carerId)!
      schedule.entries.push(entry as RotaEntry)
      schedule.totalHours += this.calculateShiftHours(entry.startTime, entry.endTime)
      
      if (entry.shiftType === ShiftType.DAY) {
        schedule.dayShifts++
      } else {
        schedule.nightShifts++
      }
    }

    // Validate each carer's schedule
    for (const schedule of carerSchedules.values()) {
      for (const entry of schedule.entries) {
        const validationResult = await this.validateRotaEntry({
          ...entry,
          shiftType: entry.shiftType as ShiftType,
          carer: entry.carer ? { ...entry.carer, deletedAt: entry.carer.deletedAt || undefined } : undefined,
          package: entry.package ? { ...entry.package, deletedAt: entry.package.deletedAt || undefined } : undefined
        }, weekEntries.map(e => ({
          ...e,
          shiftType: e.shiftType as ShiftType,
          carer: e.carer ? { ...e.carer, deletedAt: e.carer.deletedAt || undefined } : undefined,
          package: e.package ? { ...e.package, deletedAt: e.package.deletedAt || undefined } : undefined
        })))
        schedule.violations.push(...validationResult.violations, ...validationResult.warnings)
      }
    }

    return Array.from(carerSchedules.values())
  }

  /**
   * Rule 1: Validate minimum staffing requirements
   */
  private async validateMinimumStaffing(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    existingEntries: RotaEntry[]
  ): Promise<RuleViolation | null> {
    try {
      // Get all carers working the same shift type on the same day
      const sameShiftCarers = existingEntries.filter(e => 
        e.date.toDateString() === new Date(entry.date).toDateString() &&
        e.shiftType === entry.shiftType &&
        e.packageId === entry.packageId
      )

      // Include the new entry
      const allCarers = [...sameShiftCarers, entry]

      // Get tasks assigned to this care package
      const packageTasks = await prisma.packageTaskAssignment.findMany({
        where: {
          packageId: entry.packageId,
          isActive: true,
          task: { deletedAt: null }
        },
        select: { 
          taskId: true,
          task: { select: { name: true } }
        }
      })

      const packageTaskIds = packageTasks.map(pt => pt.taskId)

      // If no tasks assigned to package, provide warning but allow scheduling
      if (packageTaskIds.length === 0) {
        return {
          rule: 'NO_PACKAGE_TASKS',
          message: `Package has no tasks assigned`,
          severity: 'warning'
        }
      }

      // Get competency information for all carers, filtered by package tasks
      const carerIds = allCarers.map(e => e.carerId)
      const carersWithCompetencies = await prisma.carer.findMany({
        where: {
          id: { in: carerIds }
        },
        include: {
          competencyRatings: {
            where: {
              taskId: { in: packageTaskIds },
              level: {
                in: [CompetencyLevel.COMPETENT, CompetencyLevel.PROFICIENT, CompetencyLevel.EXPERT]
              }
            },
            include: {
              task: { select: { name: true } }
            }
          }
        }
      })

      // Count competent carers (those with at least one competent rating for package tasks)
      const competentCarers = carersWithCompetencies.filter(carer => 
        carer.competencyRatings.length > 0
      )

      if (competentCarers.length < SCHEDULING_RULES.MIN_COMPETENT_STAFF) {
        return {
          rule: 'MIN_COMPETENT_STAFF',
          message: `This shift needs a competent supervisor`,
          severity: 'warning'
        }
      }

      return null
    } catch (error) {
      console.error('Error validating minimum staffing:', error)
      return {
        rule: 'MIN_COMPETENT_STAFF',
        message: 'Error checking minimum staffing requirements',
        severity: 'error'
      }
    }
  }

  /**
   * Rule 2: Validate competency pairing requirements
   */
  private async validateCompetencyPairing(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    existingEntries: RotaEntry[],
    carer: any
  ): Promise<RuleViolation | null> {
    try {
      // Get tasks assigned to this care package
      const packageTasks = await prisma.packageTaskAssignment.findMany({
        where: {
          packageId: entry.packageId,
          isActive: true,
          task: { deletedAt: null }
        },
        select: { 
          taskId: true,
          task: { select: { name: true } }
        }
      })

      const packageTaskIds = packageTasks.map(pt => pt.taskId)

      // If no tasks assigned to package, skip competency pairing validation
      if (packageTaskIds.length === 0) {
        return null // Allow scheduling to proceed without competency restrictions
      }

      // Check if carer is competent for package-specific tasks
      const carerPackageCompetencies = carer.competencyRatings.filter((rating: any) =>
        packageTaskIds.includes(rating.taskId) &&
        [CompetencyLevel.COMPETENT, CompetencyLevel.PROFICIENT, CompetencyLevel.EXPERT].includes(rating.level)
      )

      const isCompetentForPackage = carerPackageCompetencies.length > 0

      // If carer is competent for package tasks, they can work with anyone
      if (isCompetentForPackage) {
        return null
      }

      // If carer is non-competent for package, check if there's at least one package-competent carer on the same shift
      const sameShiftCarers = existingEntries.filter(e => 
        e.date.toDateString() === new Date(entry.date).toDateString() &&
        e.shiftType === entry.shiftType &&
        e.packageId === entry.packageId
      )

      const carerIds = sameShiftCarers.map(e => e.carerId)
      const competentCarersOnShift = await prisma.carer.findMany({
        where: {
          id: { in: carerIds },
          competencyRatings: {
            some: {
              taskId: { in: packageTaskIds },
              level: {
                in: [CompetencyLevel.COMPETENT, CompetencyLevel.PROFICIENT, CompetencyLevel.EXPERT]
              }
            }
          }
        },
        include: {
          competencyRatings: {
            where: {
              taskId: { in: packageTaskIds },
              level: {
                in: [CompetencyLevel.COMPETENT, CompetencyLevel.PROFICIENT, CompetencyLevel.EXPERT]
              }
            }
          }
        }
      })

      if (competentCarersOnShift.length === 0) {
        return {
          rule: 'COMPETENCY_PAIRING',
          message: `${carer.name} needs assessment for this package`,
          severity: 'warning',
          carerId: entry.carerId,
          carerName: carer.name
        }
      }

      return null
    } catch (error) {
      console.error('Error validating competency pairing:', error)
      return {
        rule: 'COMPETENCY_PAIRING',
        message: 'Error checking competency pairing requirements',
        severity: 'error'
      }
    }
  }

  /**
   * Rule 3: Validate weekly hour limits
   */
  private async validateWeeklyHours(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    carerName: string
  ): Promise<RuleViolation | null> {
    try {
      const weekStart = this.getWeekStart(new Date(entry.date))
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)

      // Get all entries for this carer in the same week
      const weekEntries = await prisma.rotaEntry.findMany({
        where: {
          carerId: entry.carerId,
          date: {
            gte: weekStart,
            lt: weekEnd
          }
        }
      })

      // Calculate total hours including the new entry
      let totalHours = 0
      for (const weekEntry of weekEntries) {
        totalHours += this.calculateShiftHours(weekEntry.startTime, weekEntry.endTime)
      }

      const proposedHours = this.calculateShiftHours(entry.startTime, entry.endTime)
      const newTotal = totalHours + proposedHours

      if (newTotal > SCHEDULING_RULES.WEEKLY_HOUR_LIMIT) {
        return {
          rule: 'WEEKLY_HOUR_LIMIT',
          message: `${carerName} would exceed weekly hours (${newTotal}/${SCHEDULING_RULES.WEEKLY_HOUR_LIMIT})`,
          severity: 'error',
          carerId: entry.carerId,
          carerName
        }
      }

      return null
    } catch (error) {
      console.error('Error validating weekly hours:', error)
      return {
        rule: 'WEEKLY_HOUR_LIMIT',
        message: 'Error checking weekly hour limits',
        severity: 'error'
      }
    }
  }

  /**
   * Rule 4: Validate rotation pattern (1 week days → 1 week nights)
   */
  private async validateRotationPattern(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    carerName: string
  ): Promise<RuleViolation | null> {
    try {
      const currentWeekStart = this.getWeekStart(new Date(entry.date))
      const previousWeekStart = new Date(currentWeekStart)
      previousWeekStart.setDate(previousWeekStart.getDate() - 7)
      const previousWeekEnd = new Date(currentWeekStart)

      // Get previous week entries
      const previousWeekEntries = await prisma.rotaEntry.findMany({
        where: {
          carerId: entry.carerId,
          date: {
            gte: previousWeekStart,
            lt: previousWeekEnd
          }
        }
      })

      if (previousWeekEntries.length === 0) {
        return null // No previous week data to validate against
      }

      // Check if previous week had opposite shift type
      const previousWeekShiftTypes = new Set(previousWeekEntries.map(e => e.shiftType))
      
      // If previous week had mixed shifts, rotation pattern doesn't apply
      if (previousWeekShiftTypes.size > 1) {
        return null
      }

      const previousWeekShiftType = Array.from(previousWeekShiftTypes)[0]
      
      // Warning if not following rotation pattern
      if (previousWeekShiftType === entry.shiftType) {
        return {
          rule: 'ROTATION_PATTERN',
          message: `${carerName} worked ${previousWeekShiftType.toLowerCase()} shifts last week`,
          severity: 'warning',
          carerId: entry.carerId,
          carerName
        }
      }

      return null
    } catch (error) {
      console.error('Error validating rotation pattern:', error)
      return null // Non-critical validation
    }
  }

  /**
   * Rule 5: Validate consecutive weekends restriction
   */
  private async validateConsecutiveWeekends(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    carerName: string
  ): Promise<RuleViolation | null> {
    try {
      const entryDate = new Date(entry.date)
      const dayOfWeek = entryDate.getDay()

      // Only check for weekend shifts (Saturday = 6, Sunday = 0)
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        return null
      }

      // Get previous weekend dates
      const previousWeekendStart = new Date(entryDate)
      if (dayOfWeek === 6) { // Saturday
        previousWeekendStart.setDate(previousWeekendStart.getDate() - 7)
      } else { // Sunday
        previousWeekendStart.setDate(previousWeekendStart.getDate() - 7)
      }
      
      const previousWeekendEnd = new Date(previousWeekendStart)
      previousWeekendEnd.setDate(previousWeekendEnd.getDate() + 1)

      // Check for previous weekend shifts
      const previousWeekendShifts = await prisma.rotaEntry.findMany({
        where: {
          carerId: entry.carerId,
          date: {
            gte: previousWeekendStart,
            lte: previousWeekendEnd
          }
        }
      })

      if (previousWeekendShifts.length > 0) {
        return {
          rule: 'CONSECUTIVE_WEEKENDS',
          message: `${carerName} worked last weekend`,
          severity: 'error',
          carerId: entry.carerId,
          carerName
        }
      }

      return null
    } catch (error) {
      console.error('Error validating consecutive weekends:', error)
      return {
        rule: 'CONSECUTIVE_WEEKENDS',
        message: 'Error checking consecutive weekend restrictions',
        severity: 'error'
      }
    }
  }

  /**
   * Rule 7: Validate rest period requirements
   */
  private async validateRestPeriods(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    carerName: string
  ): Promise<RuleViolation | null> {
    try {
      // Only validate if this is a day shift
      if (entry.shiftType !== ShiftType.DAY) {
        return null
      }

      const entryDate = new Date(entry.date)
      
      // Check for night shifts in the previous 48 hours
      const checkStart = new Date(entryDate)
      checkStart.setHours(checkStart.getHours() - SCHEDULING_RULES.REST_PERIOD_NIGHT_TO_DAY)

      const recentNightShifts = await prisma.rotaEntry.findMany({
        where: {
          carerId: entry.carerId,
          shiftType: ShiftType.NIGHT,
          date: {
            gte: checkStart,
            lt: entryDate
          }
        }
      })

      if (recentNightShifts.length > 0) {
        const lastNightShift = recentNightShifts[recentNightShifts.length - 1]
        const timeSinceNightShift = entryDate.getTime() - lastNightShift.date.getTime()
        const hoursSince = timeSinceNightShift / (1000 * 60 * 60)

        if (hoursSince < SCHEDULING_RULES.REST_PERIOD_NIGHT_TO_DAY) {
          return {
            rule: 'REST_PERIOD_VIOLATION',
            message: `${carerName} needs rest after night shift`,
            severity: 'error',
            carerId: entry.carerId,
            carerName
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error validating rest periods:', error)
      return {
        rule: 'REST_PERIOD_VIOLATION',
        message: 'Error checking rest period requirements',
        severity: 'error'
      }
    }
  }

  /**
   * Rule 9: Validate no duplicate shifts - same carer cannot work twice on the same day
   */
  private async validateNoDuplicateShifts(
    entry: Omit<RotaEntry, 'id' | 'createdAt' | 'createdByAdminId'>,
    existingEntries: RotaEntry[]
  ): Promise<RuleViolation | null> {
    try {
      // Check database directly to avoid issues with existingEntries array
      const existingShiftsForCarer = await prisma.rotaEntry.findMany({
        where: {
          carerId: entry.carerId,
          packageId: entry.packageId,
          date: new Date(entry.date)
        }
      })

      if (existingShiftsForCarer.length > 0) {
        const date = new Date(entry.date)
        const dayName = date.toLocaleDateString('en-GB', { weekday: 'long' })
        const dayNumber = date.getDate()
        
        return {
          rule: 'NO_DUPLICATE_SHIFTS',
          message: `Carer already scheduled on ${dayName} ${dayNumber}`,
          severity: 'error',
          carerId: entry.carerId
        }
      }

      return null
    } catch (error) {
      console.error('Error validating duplicate shifts:', error)
      return {
        rule: 'NO_DUPLICATE_SHIFTS',
        message: 'Error checking for duplicate shifts',
        severity: 'error'
      }
    }
  }


  /**
   * Get existing rota entries for a package
   */
  private async getExistingEntries(packageId: string): Promise<RotaEntry[]> {
    return await prisma.rotaEntry.findMany({
      where: { packageId },
      include: {
        carer: true,
        package: true
      }
    }) as RotaEntry[]
  }

  /**
   * Calculate shift hours from time strings
   */
  private calculateShiftHours(startTime: string, endTime: string): number {
    const parseTime = (timeStr: string): number => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      return hours + minutes / 60
    }

    let start = parseTime(startTime)
    let end = parseTime(endTime)

    // Handle overnight shifts
    if (end < start) {
      end += 24
    }

    return end - start
  }

  /**
   * Get start of week (Monday)
   */
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }
}

export const schedulingRulesEngine = new SchedulingRulesEngine()