// Core User Types
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
  // Account lockout fields
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  lastFailedLogin?: Date;
}

export interface Carer {
  id: string;
  email: string;
  name: string;
  passwordHash?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  lastLogin?: Date;
  // Account lockout fields
  failedLoginAttempts?: number;
  lockoutUntil?: Date;
  lastFailedLogin?: Date;
  // Computed fields
  isFullyAssessed?: boolean;
  packages?: CarerPackageAssignment[];
  competencies?: CompetencyRating[];
  shiftApplications?: ShiftApplication[];
}

// Care Package Types
export interface CarePackage {
  id: string;
  name: string;
  postcode: string; // UK postcode outward code only (e.g., SW1A, M1, B33)
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relations
  carers?: CarerPackageAssignment[];
  tasks?: PackageTaskAssignment[];
}

// Task Types
export interface Task {
  id: string;
  name: string;
  targetCount: number; // Target completion count for 100%
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Relations
  packages?: PackageTaskAssignment[];
  assessments?: AssessmentTaskCoverage[];
}

// Assignment Types
export interface CarerPackageAssignment {
  id: string;
  carerId: string;
  packageId: string;
  assignedAt: Date;
  isActive: boolean;
  // Relations
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
  // Relations
  package?: CarePackage;
  task?: Task;
}

// Assessment Types
export interface Assessment {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Section 1 - Knowledge
  knowledgeQuestions: KnowledgeQuestion[];
  // Section 2 - Practical Skills
  practicalSkills: PracticalSkill[];
  // Section 3 - Emergency
  emergencyQuestions: EmergencyQuestion[];
  // Section 4 - Tasks
  tasksCovered: AssessmentTaskCoverage[];
  displayTaskId?: string; // Task to show assessment button on progress page
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

// Assessment Response Types
export interface AssessmentResponse {
  id: string;
  assessmentId: string;
  carerId: string;
  assessorId: string;
  assessorName: string;
  assessorUniqueId: string;
  completedAt: Date;
  overallRating: CompetencyLevel;
  // Response sections
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

// Draft Assessment Response Types
export interface DraftAssessmentResponse {
  id: string;
  assessmentId: string;
  carerId: string;
  createdByAdminId: string;
  draftData: AssessmentDraftData;
  lastSaved: Date;
  createdAt: Date;
  syncedToServer: boolean;
  // Relations
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

// Progress & Competency Types
export interface TaskProgress {
  id: string;
  carerId: string;
  packageId: string;
  taskId: string;
  completionCount: number;
  completionPercentage: number;
  lastUpdated: Date;
  // Relations
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
  // Confirmation fields
  confirmedAt?: Date;
  confirmedByCarerId?: string;
  confirmationMethod?: string;
  notificationSentAt?: Date;
  // Relations
  carer?: Carer;
  task?: Task;
  assessmentResponse?: AssessmentResponse;
}

// Shift & Rota Types
export interface Shift {
  id: string;
  packageId: string;
  date: Date;
  startTime: string; // HH:MM format
  endTime: string;   // HH:MM format
  requiredCompetencies: string[]; // Task IDs that require competency
  isCompetentOnly: boolean;
  status: ShiftStatus;
  selectedCarerId?: string;
  expiresAt?: Date;
  createdAt: Date;
  createdByAdminId: string;
  rotaEntryId?: string; // Links to created rota entry when assigned
  // Relations
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
  // Relations
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
  // Relations
  package?: CarePackage;
  carer?: Carer;
}

// Audit & System Types
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

// Invitation Types
export interface Invitation {
  id: string;
  email: string;
  userType: InvitationType;
  token: string;
  // Admin-specific fields
  name?: string;
  // Carer-specific fields
  firstName?: string;
  lastName?: string;
  // Common fields
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  declinedAt?: Date;
  status: InvitationStatus;
  // Relations
  invitedByAdmin?: AdminUser;
}

// Enums
export enum CompetencyLevel {
  NOT_ASSESSED = 'NOT_ASSESSED',
  NOT_COMPETENT = 'NOT_COMPETENT',
  ADVANCED_BEGINNER = 'ADVANCED_BEGINNER',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT'
}

export enum CompetencySource {
  ASSESSMENT = 'ASSESSMENT',
  MANUAL = 'MANUAL'
}

export enum PracticalRating {
  COMPETENT = 'COMPETENT',
  NEEDS_SUPPORT = 'NEEDS_SUPPORT',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}

export enum ShiftStatus {
  PENDING = 'PENDING',
  WAITING_RESPONSES = 'WAITING_RESPONSES',
  HAS_APPLICATIONS = 'HAS_APPLICATIONS',
  ASSIGNED = 'ASSIGNED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED'
}

export enum ShiftApplicationStatus {
  PENDING = 'PENDING',
  SELECTED = 'SELECTED',
  REJECTED = 'REJECTED'
}

export enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT'
}

export enum InvitationType {
  ADMIN = 'ADMIN',
  CARER = 'CARER'
}

export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}

// API Response Types
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

// Dashboard Types
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

// Form Types with index signatures for API compatibility
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

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface RuleViolation {
  rule: string;
  message: string;
  severity: 'error' | 'warning';
  // Optional extended properties for UI handling
  uniqueKey?: string;
  timestamp?: number;
  carerName?: string;
  isPersistent?: boolean;
}

// Scheduling Rule Types
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

// Additional types for Rota system
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

// Validation and rule violation types
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

// Error handling types
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

// Batch operations
export interface BatchDeleteResult {
  deletedCount: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

// Assessment draft data types
export interface AssessmentValidationData {
  packageId: string;
  carerId: string;
  date: string;
  shiftType: ShiftType;
  startTime: string;
  endTime: string;
}

// Extended API response types
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

// Union type for all API responses
export type StandardApiResponse<T = unknown> = SuccessApiResponse<T> | FailedApiResponse;

// Additional form interfaces with index signatures
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

// Audit Log Types for Activity Feed
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

// Carer Dashboard Types
export interface CarerDashboardSummary {
  progressPercentage: number;
  totalCompetencies: number;
  completedCompetencies: number;
  pendingConfirmations: number;
  thisWeekShifts: number;
  totalShiftApplications: number;
  todaysTasks: number;
  nextShift: {
    date: Date;
    package: string;
    location: string;
  } | null;
}

export interface CarerNotification {
  type: 'competency_confirmation' | 'shift_update';
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  data: any;
  createdAt: Date;
}

export interface CarerActivityItem {
  type: 'competency_update' | 'shift_application';
  date: Date;
  data: any;
}

// Carer Progress Types
export interface CarerProgressOverview {
  overview: {
    totalCompetencies: number;
    completedCompetencies: number;
    confirmedCompetencies: number;
    averageProgress: number;
  };
  categories: CarerProgressCategory[];
}

export interface CarerProgressCategory {
  category: string;
  competencies: CarerCompetencyProgress[];
  averageRating: number;
  completedCount: number;
  totalCount: number;
}

export interface CarerCompetencyProgress {
  id: string;
  name: string;
  rating: number;
  isCompleted: boolean;
  isConfirmed: boolean;
  lastUpdated: Date;
  assessmentTitle?: string;
}

export interface CarerPendingConfirmation {
  id: string;
  competencyName: string;
  assessmentTitle?: string;
  category?: string;
  completedAt: Date;
  rating: number;
}

export interface CarerAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  progress: number;
  target: number;
}

export interface CarerAchievementsResponse {
  summary: {
    totalAchievements: number;
    earnedAchievements: number;
    confirmedCompetencies: number;
    totalCompetencies: number;
    completedShifts: number;
  };
  achievements: CarerAchievement[];
}