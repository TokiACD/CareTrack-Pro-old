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
}

export interface Carer {
  id: string;
  email: string;
  name: string;
  phone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // Computed fields
  isFullyAssessed?: boolean;
  packages?: CarerPackageAssignment[];
  competencies?: CompetencyRating[];
}

// Care Package Types
export interface CarePackage {
  id: string;
  name: string;
  postcode: string; // 3 digits only
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
  // Relations
  carer?: Carer;
  task?: Task;
  assessmentResponse?: AssessmentResponse;
}

// Shift & Rota Types
export interface Shift {
  id: string;
  packageId: string;
  name: string;
  description: string;
  requiredCompetencies: string[]; // Task IDs that require competency
  isCompetentOnly: boolean;
  createdAt: Date;
  createdByAdminId: string;
  // Relations
  package?: CarePackage;
  assignments?: ShiftAssignment[];
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
  phone?: string;
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
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
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

// Form Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface InviteAdminRequest {
  email: string;
  name: string;
}

export interface InviteCarerRequest {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
}

export interface CreateCarerRequest {
  email: string;
  name: string;
  phone: string;
}

export interface CreateCarePackageRequest {
  name: string;
  postcode: string;
}

export interface CreateTaskRequest {
  name: string;
  targetCount: number;
}

export interface AssignCarerToPackageRequest {
  carerId: string;
  packageId: string;
}

export interface AssignTaskToPackageRequest {
  taskId: string;
  packageId: string;
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