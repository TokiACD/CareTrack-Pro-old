import { CompetencyLevel, CompetencySource, RuleViolation, RotaEntry, ShiftType } from './types';
import { SYSTEM_CONSTANTS, SCHEDULING_RULES } from './constants';

// Date utilities
export const dateUtils = {
  formatDate: (date: Date): string => {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  },

  formatDateTime: (date: Date): string => {
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  },

  getWeekStart: (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start of week
    return new Date(d.setDate(diff));
  },

  getWeekEnd: (date: Date): Date => {
    const weekStart = dateUtils.getWeekStart(date);
    return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  },

  addDays: (date: Date, days: number): Date => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  },

  addHours: (date: Date, hours: number): Date => {
    const result = new Date(date);
    result.setHours(result.getHours() + hours);
    return result;
  },

  isSameDay: (date1: Date, date2: Date): boolean => {
    return date1.toDateString() === date2.toDateString();
  },

  isWeekend: (date: Date): boolean => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  }
};

// Validation utilities
export const validationUtils = {
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  isValidPostcode: (postcode: string): boolean => {
    return /^\d{3}$/.test(postcode);
  },


  validateTargetCount: (count: number): boolean => {
    return Number.isInteger(count) && count > 0;
  }
};

// Competency utilities
export const competencyUtils = {
  getCompetencyDisplayName: (level: CompetencyLevel): string => {
    const names = {
      [CompetencyLevel.NOT_ASSESSED]: 'Not Assessed',
      [CompetencyLevel.NOT_COMPETENT]: 'Not Competent',
      [CompetencyLevel.ADVANCED_BEGINNER]: 'Advanced Beginner',
      [CompetencyLevel.COMPETENT]: 'Competent',
      [CompetencyLevel.PROFICIENT]: 'Proficient',
      [CompetencyLevel.EXPERT]: 'Expert'
    };
    return names[level];
  },

  isCompetentOrAbove: (level: CompetencyLevel): boolean => {
    const competentLevels = [
      CompetencyLevel.COMPETENT,
      CompetencyLevel.PROFICIENT,
      CompetencyLevel.EXPERT
    ];
    return competentLevels.includes(level);
  },

  getCompetencyColor: (level: CompetencyLevel): string => {
    const colors = {
      [CompetencyLevel.NOT_ASSESSED]: '#9e9e9e',
      [CompetencyLevel.NOT_COMPETENT]: '#f44336',
      [CompetencyLevel.ADVANCED_BEGINNER]: '#ff9800',
      [CompetencyLevel.COMPETENT]: '#4caf50',
      [CompetencyLevel.PROFICIENT]: '#2196f3',
      [CompetencyLevel.EXPERT]: '#9c27b0'
    };
    return colors[level];
  },

  formatCompetencySource: (source: CompetencySource, adminName?: string, setAt?: Date): string => {
    if (source === CompetencySource.MANUAL && adminName && setAt) {
      return `Manual - Set by ${adminName} on ${dateUtils.formatDate(setAt)}`;
    }
    if (source === CompetencySource.ASSESSMENT && setAt) {
      return `Assessment - Completed on ${dateUtils.formatDate(setAt)}`;
    }
    return source === CompetencySource.MANUAL ? 'Manual' : 'Assessment';
  }
};

// Progress utilities
export const progressUtils = {
  calculateCompletionPercentage: (completed: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min(Math.round((completed / target) * 100), 100);
  },

  isEligibleForAssessment: (progressPercentage: number): boolean => {
    return progressPercentage >= SYSTEM_CONSTANTS.ASSESSMENT_COMPLETION_THRESHOLD;
  },

  getProgressColor: (percentage: number): string => {
    if (percentage >= 90) return '#4caf50'; // Green
    if (percentage >= 70) return '#ff9800'; // Orange
    if (percentage >= 50) return '#2196f3'; // Blue
    return '#f44336'; // Red
  }
};

// Scheduling utilities
export const schedulingUtils = {
  calculateWeeklyHours: (entries: RotaEntry[], carerId: string, weekStart: Date): number => {
    const weekEnd = dateUtils.getWeekEnd(weekStart);
    const carerEntries = entries.filter(entry => 
      entry.carerId === carerId &&
      entry.date >= weekStart &&
      entry.date <= weekEnd
    );

    return carerEntries.reduce((total, entry) => {
      const start = new Date(`1970-01-01T${entry.startTime}`);
      const end = new Date(`1970-01-01T${entry.endTime}`);
      let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
      
      // Handle overnight shifts
      if (hours < 0) {
        hours += 24;
      }
      
      return total + hours;
    }, 0);
  },

  validateRotaEntry: (entry: RotaEntry, allEntries: RotaEntry[]): RuleViolation[] => {
    const violations: RuleViolation[] = [];
    const weekStart = dateUtils.getWeekStart(entry.date);
    
    // Check weekly hour limit
    const weeklyHours = schedulingUtils.calculateWeeklyHours(allEntries, entry.carerId, weekStart);
    const entryHours = schedulingUtils.calculateShiftHours(entry);
    
    if (weeklyHours + entryHours > SCHEDULING_RULES.WEEKLY_HOUR_LIMIT) {
      violations.push({
        rule: 'WEEKLY_HOUR_LIMIT',
        message: `Would exceed weekly limit of ${SCHEDULING_RULES.WEEKLY_HOUR_LIMIT} hours (currently ${weeklyHours}h, adding ${entryHours}h)`,
        severity: 'error'
      });
    }

    // Check rest period for night to day shifts
    const previousShifts = allEntries.filter(e => 
      e.carerId === entry.carerId &&
      e.date < entry.date &&
      e.date >= dateUtils.addDays(entry.date, -7)
    ).sort((a, b) => b.date.getTime() - a.date.getTime());

    const lastShift = previousShifts[0];
    if (lastShift && lastShift.shiftType === ShiftType.NIGHT && entry.shiftType === ShiftType.DAY) {
      const hoursSinceLastShift = (entry.date.getTime() - lastShift.date.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLastShift < SCHEDULING_RULES.REST_PERIOD_NIGHT_TO_DAY) {
        violations.push({
          rule: 'INSUFFICIENT_REST',
          message: `Insufficient rest period between night and day shifts (${Math.round(hoursSinceLastShift)}h, requires ${SCHEDULING_RULES.REST_PERIOD_NIGHT_TO_DAY}h)`,
          severity: 'error'
        });
      }
    }

    // Check consecutive weekends
    if (dateUtils.isWeekend(entry.date)) {
      const lastWeekend = schedulingUtils.findLastWeekendShift(allEntries, entry.carerId, entry.date);
      if (lastWeekend && schedulingUtils.isConsecutiveWeekend(lastWeekend.date, entry.date)) {
        violations.push({
          rule: 'CONSECUTIVE_WEEKENDS',
          message: 'Cannot schedule consecutive weekends',
          severity: 'error'
        });
      }
    }

    return violations;
  },

  calculateShiftHours: (entry: RotaEntry): number => {
    const start = new Date(`1970-01-01T${entry.startTime}`);
    const end = new Date(`1970-01-01T${entry.endTime}`);
    let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // Handle overnight shifts
    if (hours < 0) {
      hours += 24;
    }
    
    return hours;
  },

  findLastWeekendShift: (entries: RotaEntry[], carerId: string, beforeDate: Date): RotaEntry | null => {
    const weekendShifts = entries
      .filter(entry => 
        entry.carerId === carerId &&
        entry.date < beforeDate &&
        dateUtils.isWeekend(entry.date)
      )
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    
    return weekendShifts[0] || null;
  },

  isConsecutiveWeekend: (lastWeekendDate: Date, currentWeekendDate: Date): boolean => {
    const daysDiff = (currentWeekendDate.getTime() - lastWeekendDate.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 7; // Within a week means consecutive
  }
};

// Soft delete utilities
export const softDeleteUtils = {
  isActive: (item: { deletedAt?: Date | null }): boolean => {
    return !item.deletedAt;
  },

  canRestore: (item: { deletedAt?: Date | null }): boolean => {
    if (!item.deletedAt) return false;
    
    const deletedDate = new Date(item.deletedAt);
    const now = new Date();
    const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
    
    return daysSinceDeleted <= SYSTEM_CONSTANTS.RECYCLE_BIN_RETENTION_DAYS;
  },

  daysUntilPermanentDelete: (deletedAt: Date): number => {
    const now = new Date();
    const daysSinceDeleted = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, SYSTEM_CONSTANTS.RECYCLE_BIN_RETENTION_DAYS - Math.floor(daysSinceDeleted));
  }
};

// Search utilities
export const searchUtils = {
  normalizeSearchTerm: (term: string): string => {
    return term.toLowerCase().trim();
  },

  matchesSearch: (searchTerm: string, ...fields: (string | null | undefined)[]): boolean => {
    if (!searchTerm) return true;
    
    const normalizedTerm = searchUtils.normalizeSearchTerm(searchTerm);
    return fields.some(field => 
      field && searchUtils.normalizeSearchTerm(field).includes(normalizedTerm)
    );
  }
};

// PDF utilities
export const pdfUtils = {
  generateFilename: (prefix: string, suffix?: string): string => {
    const timestamp = new Date().toISOString().split('T')[0];
    return `${prefix}_${timestamp}${suffix ? `_${suffix}` : ''}.pdf`;
  },

  formatForPdf: (text: string): string => {
    return text.replace(/\n/g, '\\n').replace(/\r/g, '');
  }
};

// API utilities
export const apiUtils = {
  createQueryString: (params: Record<string, any>): string => {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    
    return searchParams.toString();
  },

  handleApiError: (error: any): string => {
    if (error.response?.data?.error) {
      return error.response.data.error;
    }
    if (error.message) {
      return error.message;
    }
    return 'An unexpected error occurred';
  }
};