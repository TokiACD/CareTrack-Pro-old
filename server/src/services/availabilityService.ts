import { PrismaClient } from '@prisma/client'
import { CompetencyLevel, Carer, RotaEntry, Shift, ShiftType } from '@caretrack/shared'

const prisma = new PrismaClient()

export interface AvailabilityCheck {
  carerId: string
  isAvailable: boolean
  conflicts: AvailabilityConflict[]
  competencyMatch: CompetencyMatch
}

export interface AvailabilityConflict {
  type: 'ROTA_CONFLICT' | 'WEEKLY_HOURS_EXCEEDED' | 'REST_PERIOD_VIOLATION' | 'CONSECUTIVE_WEEKENDS'
  message: string
  conflictingEntry?: RotaEntry
  additionalInfo?: Record<string, any>
}

export interface CompetencyMatch {
  isCompetent: boolean
  requiredTasks: string[]
  competentTasks: string[]
  missingCompetencies: string[]
}

export class AvailabilityService {
  /**
   * Check availability for a specific shift
   */
  async checkShiftAvailability(
    shiftDate: Date,
    startTime: string,
    endTime: string,
    packageId: string,
    requiredCompetencies: string[],
    isCompetentOnly: boolean,
    shiftType: ShiftType,
    excludeCarerIds: string[] = []
  ): Promise<AvailabilityCheck[]> {
    // Get all active carers assigned to this package
    const packageCarers = await this.getPackageCarers(packageId, excludeCarerIds)
    
    // Check availability for each carer
    const availabilityChecks = await Promise.all(
      packageCarers.map(carer => this.checkCarerAvailability(
        carer,
        shiftDate,
        startTime,
        endTime,
        requiredCompetencies,
        isCompetentOnly,
        shiftType
      ))
    )

    return availabilityChecks
  }

  /**
   * Get carers available for non-competent shifts (all carers, not just package-assigned)
   */
  async getAvailableCarersForNonCompetentShift(
    shiftDate: Date,
    startTime: string,
    endTime: string,
    packageId: string,
    shiftType: ShiftType
  ): Promise<AvailabilityCheck[]> {
    try {
      console.log('getAvailableCarersForNonCompetentShift called with:', {
        shiftDate: shiftDate.toISOString(),
        startTime,
        endTime,
        packageId,
        shiftType
      })

      // Get ALL active carers for non-competent shifts
      const allCarers = await prisma.carer.findMany({
        where: {
          deletedAt: null,
          isActive: true
        }
      })

      console.log(`Found ${allCarers.length} active carers`)
      
      // Check availability for each carer
      const availabilityChecks = await Promise.all(
        allCarers.map(carer => this.checkCarerAvailability(
          carer,
          shiftDate,
          startTime,
          endTime,
          [], // No required competencies
          false, // Not competent-only
          shiftType
        ))
      )

      console.log(`Completed availability checks for ${availabilityChecks.length} carers`)
      return availabilityChecks
    } catch (error) {
      console.error('Error in getAvailableCarersForNonCompetentShift:', error)
      throw error
    }
  }

  /**
   * Get competent carers for competent shifts (all carers, not just package-assigned)
   */
  async getCompetentCarersForShift(
    shiftDate: Date,
    startTime: string,
    endTime: string,
    packageId: string,
    requiredCompetencies: string[],
    shiftType: ShiftType
  ): Promise<AvailabilityCheck[]> {
    try {
      console.log('getCompetentCarersForShift called with:', {
        shiftDate: shiftDate.toISOString(),
        startTime,
        endTime,
        packageId,
        requiredCompetencies,
        shiftType
      })

      // Get ALL active carers for competent shifts too
      const allCarers = await prisma.carer.findMany({
        where: {
          deletedAt: null,
          isActive: true
        }
      })

      console.log(`Found ${allCarers.length} active carers`)
      
      // Check availability for each carer
      const availabilityChecks = await Promise.all(
        allCarers.map(carer => this.checkCarerAvailability(
          carer,
          shiftDate,
          startTime,
          endTime,
          requiredCompetencies,
          true, // Competent-only
          shiftType
        ))
      )

      console.log(`Completed availability checks for ${availabilityChecks.length} carers`)
      return availabilityChecks
    } catch (error) {
      console.error('Error in getCompetentCarersForShift:', error)
      throw error
    }
  }

  /**
   * Check individual carer availability
   */
  private async checkCarerAvailability(
    carer: Carer,
    shiftDate: Date,
    startTime: string,
    endTime: string,
    requiredCompetencies: string[],
    isCompetentOnly: boolean,
    shiftType: ShiftType
  ): Promise<AvailabilityCheck> {
    try {
      const conflicts: AvailabilityConflict[] = []
      
      // Check rota conflicts
      const rotaConflicts = await this.checkRotaConflicts(carer.id, shiftDate, startTime, endTime)
      conflicts.push(...rotaConflicts)

      // Check weekly hour limits
      const weeklyHourConflicts = await this.checkWeeklyHourLimits(carer.id, shiftDate, startTime, endTime)
      conflicts.push(...weeklyHourConflicts)

      // Check rest period violations (night-to-day shifts)
      const restPeriodConflicts = await this.checkRestPeriodViolations(carer.id, shiftDate, shiftType)
      conflicts.push(...restPeriodConflicts)

      // Check consecutive weekend violations
      const weekendConflicts = await this.checkConsecutiveWeekends(carer.id, shiftDate)
      conflicts.push(...weekendConflicts)

      // Check competency requirements
      const competencyMatch = await this.checkCompetencyRequirements(
        carer.id,
        requiredCompetencies,
        isCompetentOnly
      )

      // Determine overall availability
      const hasBlockingConflicts = conflicts.some(c => 
        c.type === 'ROTA_CONFLICT' || 
        c.type === 'WEEKLY_HOURS_EXCEEDED' || 
        c.type === 'REST_PERIOD_VIOLATION'
      )
      const hasCompetencyIssues = isCompetentOnly && !competencyMatch.isCompetent

      const isAvailable = !hasBlockingConflicts && !hasCompetencyIssues

      return {
        carerId: carer.id,
        isAvailable,
        conflicts,
        competencyMatch
      }
    } catch (error) {
      console.error(`Error checking availability for carer ${carer.id}:`, error)
      // Return a safe fallback availability check
      return {
        carerId: carer.id,
        isAvailable: false,
        conflicts: [{
          type: 'ROTA_CONFLICT',
          message: 'Error checking availability'
        }],
        competencyMatch: {
          isCompetent: false,
          requiredTasks: requiredCompetencies,
          competentTasks: [],
          missingCompetencies: requiredCompetencies
        }
      }
    }
  }

  /**
   * Get carers assigned to a package
   */
  private async getPackageCarers(packageId: string, excludeCarerIds: string[]): Promise<Carer[]> {
    const assignments = await prisma.carerPackageAssignment.findMany({
      where: {
        packageId,
        isActive: true,
        carer: {
          deletedAt: null,
          isActive: true,
          id: { notIn: excludeCarerIds }
        }
      },
      include: {
        carer: true
      }
    })

    return assignments.map(a => a.carer as Carer)
  }

  /**
   * Check for rota conflicts (already scheduled shifts)
   */
  private async checkRotaConflicts(
    carerId: string,
    shiftDate: Date,
    startTime: string,
    endTime: string
  ): Promise<AvailabilityConflict[]> {
    const conflicts: AvailabilityConflict[] = []
    
    // Check for overlapping shifts on the same day
    const existingEntries = await prisma.rotaEntry.findMany({
      where: {
        carerId,
        date: {
          gte: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate()),
          lt: new Date(shiftDate.getFullYear(), shiftDate.getMonth(), shiftDate.getDate() + 1)
        }
      },
      include: {
        package: true
      }
    })

    for (const entry of existingEntries) {
      // Check if times overlap
      if (this.timesOverlap(startTime, endTime, entry.startTime, entry.endTime)) {
        conflicts.push({
          type: 'ROTA_CONFLICT',
          message: `Already scheduled for ${entry.package.name} from ${entry.startTime} to ${entry.endTime}`,
          conflictingEntry: entry as RotaEntry
        })
      }
    }

    return conflicts
  }

  /**
   * Check weekly hour limits (36 hours maximum)
   */
  private async checkWeeklyHourLimits(
    carerId: string,
    shiftDate: Date,
    startTime: string,
    endTime: string
  ): Promise<AvailabilityConflict[]> {
    const conflicts: AvailabilityConflict[] = []
    
    // Get week boundaries
    const weekStart = this.getWeekStart(shiftDate)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 7)

    // Get all rota entries for this week
    const weekEntries = await prisma.rotaEntry.findMany({
      where: {
        carerId,
        date: {
          gte: weekStart,
          lt: weekEnd
        }
      }
    })

    // Calculate current weekly hours
    let weeklyHours = 0
    for (const entry of weekEntries) {
      weeklyHours += this.calculateShiftHours(entry.startTime, entry.endTime)
    }

    // Add proposed shift hours
    const proposedHours = this.calculateShiftHours(startTime, endTime)
    const totalHours = weeklyHours + proposedHours

    if (totalHours > 36) {
      conflicts.push({
        type: 'WEEKLY_HOURS_EXCEEDED',
        message: `Would exceed 36-hour weekly limit (current: ${weeklyHours}h, proposed: ${proposedHours}h, total: ${totalHours}h)`,
        additionalInfo: {
          currentHours: weeklyHours,
          proposedHours,
          totalHours,
          limit: 36
        }
      })
    }

    return conflicts
  }

  /**
   * Check rest period violations (48 hours between night and day shifts)
   */
  private async checkRestPeriodViolations(
    carerId: string,
    shiftDate: Date,
    shiftType: ShiftType
  ): Promise<AvailabilityConflict[]> {
    const conflicts: AvailabilityConflict[] = []
    
    if (shiftType !== ShiftType.DAY) {
      return conflicts // Only check for day shifts after night shifts
    }

    // Check for night shifts in the previous 48 hours
    const checkStart = new Date(shiftDate)
    checkStart.setHours(checkStart.getHours() - 48)

    const recentNightShifts = await prisma.rotaEntry.findMany({
      where: {
        carerId,
        shiftType: ShiftType.NIGHT,
        date: {
          gte: checkStart,
          lt: shiftDate
        }
      },
      include: {
        package: true
      }
    })

    for (const nightShift of recentNightShifts) {
      const timeSinceNightShift = shiftDate.getTime() - nightShift.date.getTime()
      const hoursSince = timeSinceNightShift / (1000 * 60 * 60)
      
      if (hoursSince < 48) {
        conflicts.push({
          type: 'REST_PERIOD_VIOLATION',
          message: `Requires 48-hour rest after night shift (last night shift: ${nightShift.date.toLocaleDateString()})`,
          conflictingEntry: nightShift as RotaEntry,
          additionalInfo: {
            hoursSince: Math.round(hoursSince * 10) / 10,
            requiredHours: 48
          }
        })
      }
    }

    return conflicts
  }

  /**
   * Check consecutive weekend violations
   */
  private async checkConsecutiveWeekends(
    carerId: string,
    shiftDate: Date
  ): Promise<AvailabilityConflict[]> {
    const conflicts: AvailabilityConflict[] = []
    
    // Only check if this is a weekend shift
    const dayOfWeek = shiftDate.getDay()
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Saturday or Sunday
      return conflicts
    }

    // Get previous weekend
    const previousWeekend = new Date(shiftDate)
    if (dayOfWeek === 6) { // Saturday
      previousWeekend.setDate(previousWeekend.getDate() - 7)
    } else { // Sunday
      previousWeekend.setDate(previousWeekend.getDate() - 7)
    }
    
    const previousWeekendEnd = new Date(previousWeekend)
    previousWeekendEnd.setDate(previousWeekendEnd.getDate() + 1)

    // Check for shifts on previous weekend
    const previousWeekendShifts = await prisma.rotaEntry.findMany({
      where: {
        carerId,
        date: {
          gte: previousWeekend,
          lte: previousWeekendEnd
        }
      }
    })

    if (previousWeekendShifts.length > 0) {
      conflicts.push({
        type: 'CONSECUTIVE_WEEKENDS',
        message: `Worked previous weekend - consecutive weekends not allowed`,
        additionalInfo: {
          previousWeekendShifts: previousWeekendShifts.length
        }
      })
    }

    return conflicts
  }

  /**
   * Check competency requirements
   */
  private async checkCompetencyRequirements(
    carerId: string,
    requiredCompetencies: string[],
    isCompetentOnly: boolean
  ): Promise<CompetencyMatch> {
    if (requiredCompetencies.length === 0) {
      return {
        isCompetent: true,
        requiredTasks: [],
        competentTasks: [],
        missingCompetencies: []
      }
    }

    // Get carer's competency ratings for required tasks
    const competencies = await prisma.competencyRating.findMany({
      where: {
        carerId,
        taskId: { in: requiredCompetencies }
      },
      include: {
        task: true
      }
    })

    const competentLevels = [
      CompetencyLevel.COMPETENT,
      CompetencyLevel.PROFICIENT,
      CompetencyLevel.EXPERT
    ]

    const competentTasks = competencies
      .filter(c => competentLevels.includes(c.level as CompetencyLevel))
      .map(c => c.taskId)

    const missingCompetencies = requiredCompetencies.filter(
      taskId => !competentTasks.includes(taskId)
    )

    const isCompetent = isCompetentOnly 
      ? missingCompetencies.length === 0
      : true // Non-competent shifts don't require competency

    return {
      isCompetent,
      requiredTasks: requiredCompetencies,
      competentTasks,
      missingCompetencies
    }
  }

  /**
   * Utility: Check if two time ranges overlap
   */
  private timesOverlap(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): boolean {
    const parseTime = (timeStr: string): number => {
      try {
        const parts = timeStr.split(':')
        if (parts.length !== 2) {
          console.error('Invalid time format:', timeStr)
          return 0
        }
        const [hours, minutes] = parts.map(Number)
        if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
          console.error('Invalid time values:', timeStr, { hours, minutes })
          return 0
        }
        return hours * 60 + minutes
      } catch (error) {
        console.error('Error parsing time:', timeStr, error)
        return 0
      }
    }

    const start1Min = parseTime(start1)
    const end1Min = parseTime(end1)
    const start2Min = parseTime(start2)
    const end2Min = parseTime(end2)

    // Handle overnight shifts (end time < start time)
    const normalizeRange = (start: number, end: number) => {
      if (end < start) {
        // Overnight shift
        return [start, end + 1440] // Add 24 hours in minutes
      }
      return [start, end]
    }

    const [normStart1, normEnd1] = normalizeRange(start1Min, end1Min)
    const [normStart2, normEnd2] = normalizeRange(start2Min, end2Min)

    // Check for overlap
    return normStart1 < normEnd2 && normStart2 < normEnd1
  }

  /**
   * Utility: Calculate shift hours from time strings
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
   * Utility: Get start of week (Monday)
   */
  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date)
    const day = weekStart.getDay()
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)
    return weekStart
  }

  /**
   * Get carer details with competency information for display
   */
  async getCarerWithCompetencies(carerId: string): Promise<Carer & { competencies?: any[] }> {
    const carer = await prisma.carer.findUnique({
      where: { id: carerId },
      include: {
        competencyRatings: {
          include: {
            task: true
          }
        }
      }
    })

    if (!carer) {
      throw new Error('Carer not found')
    }

    return carer as Carer & { competencies?: any[] }
  }
}

export const availabilityService = new AvailabilityService()