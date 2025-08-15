import { CompetencyLevel, CompetencySource, RuleViolation, RotaEntry } from './types';
export declare const dateUtils: {
    formatDate: (date: Date) => string;
    formatDateTime: (date: Date) => string;
    getWeekStart: (date: Date) => Date;
    getWeekEnd: (date: Date) => Date;
    addDays: (date: Date, days: number) => Date;
    addHours: (date: Date, hours: number) => Date;
    isSameDay: (date1: Date, date2: Date) => boolean;
    isWeekend: (date: Date) => boolean;
};
export declare const validationUtils: {
    isValidEmail: (email: string) => boolean;
    isValidPostcode: (postcode: string) => boolean;
    validateTargetCount: (count: number) => boolean;
};
export declare const competencyUtils: {
    getCompetencyDisplayName: (level: CompetencyLevel) => string;
    isCompetentOrAbove: (level: CompetencyLevel) => boolean;
    getCompetencyColor: (level: CompetencyLevel) => string;
    formatCompetencySource: (source: CompetencySource, adminName?: string, setAt?: Date) => string;
};
export declare const progressUtils: {
    calculateCompletionPercentage: (completed: number, target: number) => number;
    isEligibleForAssessment: (progressPercentage: number) => boolean;
    getProgressColor: (percentage: number) => string;
};
export declare const schedulingUtils: {
    calculateWeeklyHours: (entries: RotaEntry[], carerId: string, weekStart: Date) => number;
    validateRotaEntry: (entry: RotaEntry, allEntries: RotaEntry[]) => RuleViolation[];
    calculateShiftHours: (entry: RotaEntry) => number;
    findLastWeekendShift: (entries: RotaEntry[], carerId: string, beforeDate: Date) => RotaEntry | null;
    isConsecutiveWeekend: (lastWeekendDate: Date, currentWeekendDate: Date) => boolean;
};
export declare const softDeleteUtils: {
    isActive: (item: {
        deletedAt?: Date | null;
    }) => boolean;
    canRestore: (item: {
        deletedAt?: Date | null;
    }) => boolean;
    daysUntilPermanentDelete: (deletedAt: Date) => number;
};
export declare const searchUtils: {
    normalizeSearchTerm: (term: string) => string;
    matchesSearch: (searchTerm: string, ...fields: (string | null | undefined)[]) => boolean;
};
export declare const pdfUtils: {
    generateFilename: (prefix: string, suffix?: string) => string;
    formatForPdf: (text: string) => string;
};
export declare const apiUtils: {
    createQueryString: (params: Record<string, any>) => string;
    handleApiError: (error: any) => string;
};
//# sourceMappingURL=utils.d.ts.map