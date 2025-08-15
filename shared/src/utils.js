"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiUtils = exports.pdfUtils = exports.searchUtils = exports.softDeleteUtils = exports.schedulingUtils = exports.progressUtils = exports.competencyUtils = exports.validationUtils = exports.dateUtils = void 0;
const types_1 = require("./types");
const constants_1 = require("./constants");
exports.dateUtils = {
    formatDate: (date) => {
        return new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    },
    formatDateTime: (date) => {
        return new Intl.DateTimeFormat('en-GB', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },
    getWeekStart: (date) => {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        return new Date(d.setDate(diff));
    },
    getWeekEnd: (date) => {
        const weekStart = exports.dateUtils.getWeekStart(date);
        return new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    },
    addDays: (date, days) => {
        const result = new Date(date);
        result.setDate(result.getDate() + days);
        return result;
    },
    addHours: (date, hours) => {
        const result = new Date(date);
        result.setHours(result.getHours() + hours);
        return result;
    },
    isSameDay: (date1, date2) => {
        return date1.toDateString() === date2.toDateString();
    },
    isWeekend: (date) => {
        const day = date.getDay();
        return day === 0 || day === 6;
    }
};
exports.validationUtils = {
    isValidEmail: (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    isValidPostcode: (postcode) => {
        return /^\d{3}$/.test(postcode);
    },
    validateTargetCount: (count) => {
        return Number.isInteger(count) && count > 0;
    }
};
exports.competencyUtils = {
    getCompetencyDisplayName: (level) => {
        const names = {
            [types_1.CompetencyLevel.NOT_ASSESSED]: 'Not Assessed',
            [types_1.CompetencyLevel.NOT_COMPETENT]: 'Not Competent',
            [types_1.CompetencyLevel.ADVANCED_BEGINNER]: 'Advanced Beginner',
            [types_1.CompetencyLevel.COMPETENT]: 'Competent',
            [types_1.CompetencyLevel.PROFICIENT]: 'Proficient',
            [types_1.CompetencyLevel.EXPERT]: 'Expert'
        };
        return names[level];
    },
    isCompetentOrAbove: (level) => {
        const competentLevels = [
            types_1.CompetencyLevel.COMPETENT,
            types_1.CompetencyLevel.PROFICIENT,
            types_1.CompetencyLevel.EXPERT
        ];
        return competentLevels.includes(level);
    },
    getCompetencyColor: (level) => {
        const colors = {
            [types_1.CompetencyLevel.NOT_ASSESSED]: '#9e9e9e',
            [types_1.CompetencyLevel.NOT_COMPETENT]: '#f44336',
            [types_1.CompetencyLevel.ADVANCED_BEGINNER]: '#ff9800',
            [types_1.CompetencyLevel.COMPETENT]: '#4caf50',
            [types_1.CompetencyLevel.PROFICIENT]: '#2196f3',
            [types_1.CompetencyLevel.EXPERT]: '#9c27b0'
        };
        return colors[level];
    },
    formatCompetencySource: (source, adminName, setAt) => {
        if (source === types_1.CompetencySource.MANUAL && adminName && setAt) {
            return `Manual - Set by ${adminName} on ${exports.dateUtils.formatDate(setAt)}`;
        }
        if (source === types_1.CompetencySource.ASSESSMENT && setAt) {
            return `Assessment - Completed on ${exports.dateUtils.formatDate(setAt)}`;
        }
        return source === types_1.CompetencySource.MANUAL ? 'Manual' : 'Assessment';
    }
};
exports.progressUtils = {
    calculateCompletionPercentage: (completed, target) => {
        if (target === 0)
            return 0;
        return Math.min(Math.round((completed / target) * 100), 100);
    },
    isEligibleForAssessment: (progressPercentage) => {
        return progressPercentage >= constants_1.SYSTEM_CONSTANTS.ASSESSMENT_COMPLETION_THRESHOLD;
    },
    getProgressColor: (percentage) => {
        if (percentage >= 90)
            return '#4caf50';
        if (percentage >= 70)
            return '#ff9800';
        if (percentage >= 50)
            return '#2196f3';
        return '#f44336';
    }
};
exports.schedulingUtils = {
    calculateWeeklyHours: (entries, carerId, weekStart) => {
        const weekEnd = exports.dateUtils.getWeekEnd(weekStart);
        const carerEntries = entries.filter(entry => entry.carerId === carerId &&
            entry.date >= weekStart &&
            entry.date <= weekEnd);
        return carerEntries.reduce((total, entry) => {
            const start = new Date(`1970-01-01T${entry.startTime}`);
            const end = new Date(`1970-01-01T${entry.endTime}`);
            let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (hours < 0) {
                hours += 24;
            }
            return total + hours;
        }, 0);
    },
    validateRotaEntry: (entry, allEntries) => {
        const violations = [];
        const weekStart = exports.dateUtils.getWeekStart(entry.date);
        const weeklyHours = exports.schedulingUtils.calculateWeeklyHours(allEntries, entry.carerId, weekStart);
        const entryHours = exports.schedulingUtils.calculateShiftHours(entry);
        if (weeklyHours + entryHours > constants_1.SCHEDULING_RULES.WEEKLY_HOUR_LIMIT) {
            violations.push({
                rule: 'WEEKLY_HOUR_LIMIT',
                message: `Would exceed weekly limit of ${constants_1.SCHEDULING_RULES.WEEKLY_HOUR_LIMIT} hours (currently ${weeklyHours}h, adding ${entryHours}h)`,
                severity: 'error'
            });
        }
        const previousShifts = allEntries.filter(e => e.carerId === entry.carerId &&
            e.date < entry.date &&
            e.date >= exports.dateUtils.addDays(entry.date, -7)).sort((a, b) => b.date.getTime() - a.date.getTime());
        const lastShift = previousShifts[0];
        if (lastShift && lastShift.shiftType === types_1.ShiftType.NIGHT && entry.shiftType === types_1.ShiftType.DAY) {
            const hoursSinceLastShift = (entry.date.getTime() - lastShift.date.getTime()) / (1000 * 60 * 60);
            if (hoursSinceLastShift < constants_1.SCHEDULING_RULES.REST_PERIOD_NIGHT_TO_DAY) {
                violations.push({
                    rule: 'INSUFFICIENT_REST',
                    message: `Insufficient rest period between night and day shifts (${Math.round(hoursSinceLastShift)}h, requires ${constants_1.SCHEDULING_RULES.REST_PERIOD_NIGHT_TO_DAY}h)`,
                    severity: 'error'
                });
            }
        }
        if (exports.dateUtils.isWeekend(entry.date)) {
            const lastWeekend = exports.schedulingUtils.findLastWeekendShift(allEntries, entry.carerId, entry.date);
            if (lastWeekend && exports.schedulingUtils.isConsecutiveWeekend(lastWeekend.date, entry.date)) {
                violations.push({
                    rule: 'CONSECUTIVE_WEEKENDS',
                    message: 'Cannot schedule consecutive weekends',
                    severity: 'error'
                });
            }
        }
        return violations;
    },
    calculateShiftHours: (entry) => {
        const start = new Date(`1970-01-01T${entry.startTime}`);
        const end = new Date(`1970-01-01T${entry.endTime}`);
        let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        if (hours < 0) {
            hours += 24;
        }
        return hours;
    },
    findLastWeekendShift: (entries, carerId, beforeDate) => {
        const weekendShifts = entries
            .filter(entry => entry.carerId === carerId &&
            entry.date < beforeDate &&
            exports.dateUtils.isWeekend(entry.date))
            .sort((a, b) => b.date.getTime() - a.date.getTime());
        return weekendShifts[0] || null;
    },
    isConsecutiveWeekend: (lastWeekendDate, currentWeekendDate) => {
        const daysDiff = (currentWeekendDate.getTime() - lastWeekendDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
    }
};
exports.softDeleteUtils = {
    isActive: (item) => {
        return !item.deletedAt;
    },
    canRestore: (item) => {
        if (!item.deletedAt)
            return false;
        const deletedDate = new Date(item.deletedAt);
        const now = new Date();
        const daysSinceDeleted = (now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24);
        return daysSinceDeleted <= constants_1.SYSTEM_CONSTANTS.RECYCLE_BIN_RETENTION_DAYS;
    },
    daysUntilPermanentDelete: (deletedAt) => {
        const now = new Date();
        const daysSinceDeleted = (now.getTime() - deletedAt.getTime()) / (1000 * 60 * 60 * 24);
        return Math.max(0, constants_1.SYSTEM_CONSTANTS.RECYCLE_BIN_RETENTION_DAYS - Math.floor(daysSinceDeleted));
    }
};
exports.searchUtils = {
    normalizeSearchTerm: (term) => {
        return term.toLowerCase().trim();
    },
    matchesSearch: (searchTerm, ...fields) => {
        if (!searchTerm)
            return true;
        const normalizedTerm = exports.searchUtils.normalizeSearchTerm(searchTerm);
        return fields.some(field => field && exports.searchUtils.normalizeSearchTerm(field).includes(normalizedTerm));
    }
};
exports.pdfUtils = {
    generateFilename: (prefix, suffix) => {
        const timestamp = new Date().toISOString().split('T')[0];
        return `${prefix}_${timestamp}${suffix ? `_${suffix}` : ''}.pdf`;
    },
    formatForPdf: (text) => {
        return text.replace(/\n/g, '\\n').replace(/\r/g, '');
    }
};
exports.apiUtils = {
    createQueryString: (params) => {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                searchParams.append(key, String(value));
            }
        });
        return searchParams.toString();
    },
    handleApiError: (error) => {
        if (error.response?.data?.error) {
            return error.response.data.error;
        }
        if (error.message) {
            return error.message;
        }
        return 'An unexpected error occurred';
    }
};
//# sourceMappingURL=utils.js.map