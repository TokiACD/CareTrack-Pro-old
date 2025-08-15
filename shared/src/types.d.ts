export interface AdminUser {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    invitedBy?: string;
    lastLogin?: Date;
}
export interface Carer {
    id: string;
    email: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    isFullyAssessed?: boolean;
    packages?: CarerPackageAssignment[];
    competencies?: CompetencyRating[];
    shiftApplications?: ShiftApplication[];
}
export interface CarePackage {
    id: string;
    name: string;
    postcode: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    carers?: CarerPackageAssignment[];
    tasks?: PackageTaskAssignment[];
}
export interface Task {
    id: string;
    name: string;
    targetCount: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    packages?: PackageTaskAssignment[];
    assessments?: AssessmentTaskCoverage[];
}
export interface CarerPackageAssignment {
    id: string;
    carerId: string;
    packageId: string;
    assignedAt: Date;
    isActive: boolean;
    carer?: Carer;
    package?: CarePackage;
    progress?: TaskProgress[];
}
export interface PackageTaskAssignment {
    id: string;
    packageId: string;
    taskId: string;
    assignedAt: Date;
    isActive: boolean;
    package?: CarePackage;
    task?: Task;
}
export interface Assessment {
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
    knowledgeQuestions: KnowledgeQuestion[];
    practicalSkills: PracticalSkill[];
    emergencyQuestions: EmergencyQuestion[];
    tasksCovered: AssessmentTaskCoverage[];
    displayTaskId?: string;
}
export interface KnowledgeQuestion {
    id: string;
    assessmentId: string;
    question: string;
    modelAnswer: string;
    order: number;
}
export interface PracticalSkill {
    id: string;
    assessmentId: string;
    skillDescription: string;
    canBeNotApplicable: boolean;
    order: number;
}
export interface EmergencyQuestion {
    id: string;
    assessmentId: string;
    question: string;
    modelAnswer: string;
    order: number;
}
export interface AssessmentTaskCoverage {
    id: string;
    assessmentId: string;
    taskId: string;
    assessment?: Assessment;
    task?: Task;
}
export interface AssessmentResponse {
    id: string;
    assessmentId: string;
    carerId: string;
    assessorId: string;
    assessorName: string;
    assessorUniqueId: string;
    completedAt: Date;
    overallRating: CompetencyLevel;
    knowledgeResponses: KnowledgeResponse[];
    practicalResponses: PracticalResponse[];
    emergencyResponses: EmergencyResponse[];
}
export interface KnowledgeResponse {
    id: string;
    responseId: string;
    questionId: string;
    carerAnswer: string;
}
export interface PracticalResponse {
    id: string;
    responseId: string;
    skillId: string;
    rating: PracticalRating;
}
export interface EmergencyResponse {
    id: string;
    responseId: string;
    questionId: string;
    carerAnswer: string;
}
export interface DraftAssessmentResponse {
    id: string;
    assessmentId: string;
    carerId: string;
    createdByAdminId: string;
    draftData: AssessmentDraftData;
    lastSaved: Date;
    createdAt: Date;
    syncedToServer: boolean;
    assessment?: Assessment;
    carer?: Carer;
    createdByAdmin?: AdminUser;
}
export interface AssessmentDraftData {
    carerId: string;
    assessorUniqueId?: string;
    overallRating: CompetencyLevel;
    knowledgeResponses: Array<{
        questionId: string;
        carerAnswer: string;
    }>;
    practicalResponses: Array<{
        skillId: string;
        rating: PracticalRating;
    }>;
    emergencyResponses: Array<{
        questionId: string;
        carerAnswer: string;
    }>;
}
export interface TaskProgress {
    id: string;
    carerId: string;
    packageId: string;
    taskId: string;
    completionCount: number;
    completionPercentage: number;
    lastUpdated: Date;
    carer?: Carer;
    package?: CarePackage;
    task?: Task;
}
export interface CompetencyRating {
    id: string;
    carerId: string;
    taskId: string;
    level: CompetencyLevel;
    source: CompetencySource;
    assessmentResponseId?: string;
    setByAdminId?: string;
    setByAdminName?: string;
    setAt: Date;
    notes?: string;
    carer?: Carer;
    task?: Task;
    assessmentResponse?: AssessmentResponse;
}
export interface Shift {
    id: string;
    packageId: string;
    date: Date;
    startTime: string;
    endTime: string;
    requiredCompetencies: string[];
    isCompetentOnly: boolean;
    status: ShiftStatus;
    selectedCarerId?: string;
    expiresAt?: Date;
    createdAt: Date;
    createdByAdminId: string;
    rotaEntryId?: string;
    package?: CarePackage;
    applications?: ShiftApplication[];
    assignments?: ShiftAssignment[];
    selectedCarer?: Carer;
}
export interface ShiftApplication {
    id: string;
    shiftId: string;
    carerId: string;
    appliedAt: Date;
    status: ShiftApplicationStatus;
    notes?: string;
    carer?: Carer;
    shift?: Shift;
}
export interface ShiftAssignment {
    id: string;
    shiftId: string;
    carerId: string;
    assignedAt: Date;
    confirmedAt?: Date;
    status: ShiftStatus;
}
export interface RotaEntry {
    id: string;
    packageId: string;
    carerId: string;
    date: Date;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    isConfirmed: boolean;
    createdAt: Date;
    createdByAdminId: string;
    package?: CarePackage;
    carer?: Carer;
}
export interface AuditLog {
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    performedByAdminId: string;
    performedByAdminName: string;
    performedAt: Date;
    ipAddress?: string;
    userAgent?: string;
}
export interface Invitation {
    id: string;
    email: string;
    userType: InvitationType;
    token: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    invitedBy: string;
    invitedAt: Date;
    expiresAt: Date;
    acceptedAt?: Date;
    declinedAt?: Date;
    status: InvitationStatus;
    invitedByAdmin?: AdminUser;
}
export declare enum CompetencyLevel {
    NOT_ASSESSED = "NOT_ASSESSED",
    NOT_COMPETENT = "NOT_COMPETENT",
    ADVANCED_BEGINNER = "ADVANCED_BEGINNER",
    COMPETENT = "COMPETENT",
    PROFICIENT = "PROFICIENT",
    EXPERT = "EXPERT"
}
export declare enum CompetencySource {
    ASSESSMENT = "ASSESSMENT",
    MANUAL = "MANUAL"
}
export declare enum PracticalRating {
    COMPETENT = "COMPETENT",
    NEEDS_SUPPORT = "NEEDS_SUPPORT",
    NOT_APPLICABLE = "NOT_APPLICABLE"
}
export declare enum ShiftStatus {
    PENDING = "PENDING",
    WAITING_RESPONSES = "WAITING_RESPONSES",
    HAS_APPLICATIONS = "HAS_APPLICATIONS",
    ASSIGNED = "ASSIGNED",
    CONFIRMED = "CONFIRMED",
    CANCELLED = "CANCELLED",
    COMPLETED = "COMPLETED",
    EXPIRED = "EXPIRED"
}
export declare enum ShiftApplicationStatus {
    PENDING = "PENDING",
    SELECTED = "SELECTED",
    REJECTED = "REJECTED"
}
export declare enum ShiftType {
    DAY = "DAY",
    NIGHT = "NIGHT"
}
export declare enum InvitationType {
    ADMIN = "ADMIN",
    CARER = "CARER"
}
export declare enum InvitationStatus {
    PENDING = "PENDING",
    ACCEPTED = "ACCEPTED",
    DECLINED = "DECLINED",
    EXPIRED = "EXPIRED"
}
export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface DashboardSummary {
    totalCarers: number;
    totalActiveCarers: number;
    totalCarePackages: number;
    totalTasks: number;
    carersNeedingAssessment: CarerAssessmentAlert[];
    recentActivity: AuditLog[];
}
export interface CarerAssessmentAlert {
    carer: Carer;
    package: CarePackage;
    completionPercentage: number;
    missingCompetencies: Task[];
}
export interface LoginRequest extends Record<string, unknown> {
    email: string;
    password: string;
}
export interface InviteAdminRequest extends Record<string, unknown> {
    email: string;
    name: string;
}
export interface InviteCarerRequest extends Record<string, unknown> {
    email: string;
    firstName: string;
    lastName: string;
}
export interface AcceptInvitationRequest extends Record<string, unknown> {
    token: string;
    password: string;
}
export interface CreateCarerRequest extends Record<string, unknown> {
    email: string;
    name: string;
}
export interface CreateCarePackageRequest extends Record<string, unknown> {
    name: string;
    postcode: string;
}
export interface CreateTaskRequest extends Record<string, unknown> {
    name: string;
    targetCount: number;
}
export interface AssignCarerToPackageRequest extends Record<string, unknown> {
    carerId: string;
    packageId: string;
}
export interface AssignTaskToPackageRequest extends Record<string, unknown> {
    taskId: string;
    packageId: string;
}
export interface BatchDeleteRotaRequest extends Record<string, unknown> {
    ids: string[];
}
export interface BatchDeleteRotaResponse {
    deletedCount: number;
    deletedEntries: {
        id: string;
        carerName: string;
        packageName: string;
        date: Date;
        shiftType: ShiftType;
    }[];
}
export interface ValidationError {
    field: string;
    message: string;
}
export interface RuleViolation {
    rule: string;
    message: string;
    severity: 'error' | 'warning';
    uniqueKey?: string;
    timestamp?: number;
    carerName?: string;
    isPersistent?: boolean;
}
export interface SchedulingRule {
    id: string;
    name: string;
    description: string;
    validate: (entry: RotaEntry, allEntries: RotaEntry[]) => RuleViolation[];
}
export interface WeeklyScheduleSummary {
    carerId: string;
    weekStart: Date;
    totalHours: number;
    dayShifts: number;
    nightShifts: number;
    violations: RuleViolation[];
}
export interface RotaPageData {
    weekStart: Date;
    weekEnd: Date;
    entries: RotaEntry[];
    weeklySchedules: WeeklyScheduleSummary[];
    packageCarers: CarerWithPackageCompetency[];
    otherCarers: CarerWithPackageCompetency[];
}
export interface CarerWithPackageCompetency extends Carer {
    packageCompetency?: {
        competentTaskCount: number;
        totalTaskCount: number;
        isPackageCompetent: boolean;
        hasNoTasks: boolean;
        packageTasks?: Task[];
    };
}
export interface ScheduleValidationResult {
    isValid: boolean;
    violations: RuleViolation[];
    warnings: RuleViolation[];
}
export interface DragValidationResult {
    success: boolean;
    destinationId: string;
    carerId: string;
    shiftType: ShiftType;
    date: string;
    data: ScheduleValidationResult;
}
export interface ApiError {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}
export interface ApiErrorResponse {
    success: false;
    error: string;
    violations?: RuleViolation[];
    warnings?: RuleViolation[];
}
export interface BatchDeleteResult {
    deletedCount: number;
    errors: Array<{
        id: string;
        error: string;
    }>;
}
export interface AssessmentValidationData {
    packageId: string;
    carerId: string;
    date: string;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
}
export interface SuccessApiResponse<T = unknown> extends ApiResponse<T> {
    success: true;
    data: T;
    violations?: RuleViolation[];
    warnings?: RuleViolation[];
}
export interface FailedApiResponse extends ApiResponse<never> {
    success: false;
    error: string;
    violations?: RuleViolation[];
    warnings?: RuleViolation[];
}
export type StandardApiResponse<T = unknown> = SuccessApiResponse<T> | FailedApiResponse;
export interface AssessmentFormData extends Record<string, unknown> {
    carerId: string;
    assessorUniqueId: string;
    overallRating: CompetencyLevel;
    knowledgeResponses: Array<{
        questionId: string;
        carerAnswer: string;
    }>;
    practicalResponses: Array<{
        skillId: string;
        rating: PracticalRating;
    }>;
    emergencyResponses: Array<{
        questionId: string;
        carerAnswer: string;
    }>;
}
export interface TaskFormData extends Record<string, unknown> {
    name: string;
    targetCount: number;
}
export interface PackageFormData extends Record<string, unknown> {
    name: string;
    postcode: string;
}
export interface ForgotPasswordFormData extends Record<string, unknown> {
    email: string;
}
export interface EmailChangeRequest extends Record<string, unknown> {
    id: string;
    userId: string;
    userType: string;
    oldEmail: string;
    newEmail: string;
    token: string;
    status: string;
    requestedAt: Date;
    expiresAt: Date;
    verifiedAt?: Date;
    cancelledAt?: Date;
}
export interface InviteAdminData extends Record<string, unknown> {
    email: string;
    name: string;
}
export interface AuditLogWithMessage extends AuditLog {
    message: string;
}
export interface ActivityFeedResponse {
    logs: AuditLogWithMessage[];
    total: number;
    page: number;
    totalPages: number;
}
export interface AuditStatistics {
    activity: {
        today: number;
        thisWeek: number;
        thisMonth: number;
        total: number;
    };
    topUsers: Array<{
        adminId: string;
        adminName: string;
        count: number;
    }>;
    topActions: Array<{
        action: string;
        count: number;
    }>;
}
export interface AuditLogFilter {
    action?: string;
    entityType?: string;
    entityId?: string;
    performedByAdminId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    search?: string;
}
//# sourceMappingURL=types.d.ts.map