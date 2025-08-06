import { 
  AdminUser, 
  Carer, 
  CarePackage, 
  Task, 
  Assessment,
  AssessmentResponse,
  TaskProgress,
  CompetencyRating,
  AuditLog,
  Invitation,
  CarerPackageAssignment,
  PackageTaskAssignment
} from '@caretrack/shared'
import { parseDate, DateLike } from '../utils/dateUtils'

// Type definitions for entities with normalized dates
export type NormalizedAdminUser = Omit<AdminUser, 'createdAt' | 'updatedAt' | 'deletedAt' | 'lastLogin'> & {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  lastLogin?: Date | null
}

export type NormalizedCarer = Omit<Carer, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type NormalizedCarePackage = Omit<CarePackage, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type NormalizedTask = Omit<Task, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

export type NormalizedAssessment = Omit<Assessment, 'createdAt' | 'updatedAt' | 'deletedAt'> & {
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
}

// Generic date field normalizer
function normalizeEntityDates<T extends Record<string, any>>(
  entity: T,
  dateFields: (keyof T)[]
): T {
  if (!entity || typeof entity !== 'object') return entity

  const normalized = { ...entity }

  for (const field of dateFields) {
    if (field in normalized) {
      const value = normalized[field]
      if (value !== null && value !== undefined) {
        const parsedDate = parseDate(value as DateLike)
        if (parsedDate) {
          normalized[field] = parsedDate as T[keyof T]
        }
      }
    }
  }

  return normalized
}

// Specific entity normalizers
export function normalizeAdminUser(user: AdminUser): NormalizedAdminUser {
  return normalizeEntityDates(user, [
    'createdAt',
    'updatedAt', 
    'deletedAt',
    'lastLogin'
  ]) as NormalizedAdminUser
}

export function normalizeCarer(carer: Carer): NormalizedCarer {
  return normalizeEntityDates(carer, [
    'createdAt',
    'updatedAt',
    'deletedAt'
  ]) as NormalizedCarer
}

export function normalizeCarePackage(carePackage: CarePackage): NormalizedCarePackage {
  return normalizeEntityDates(carePackage, [
    'createdAt',
    'updatedAt',
    'deletedAt'
  ]) as NormalizedCarePackage
}

export function normalizeTask(task: Task): NormalizedTask {
  return normalizeEntityDates(task, [
    'createdAt',
    'updatedAt',
    'deletedAt'
  ]) as NormalizedTask
}

export function normalizeAssessment(assessment: Assessment): NormalizedAssessment {
  return normalizeEntityDates(assessment, [
    'createdAt',
    'updatedAt',
    'deletedAt'
  ]) as NormalizedAssessment
}

export function normalizeAssessmentResponse(response: AssessmentResponse): AssessmentResponse {
  return normalizeEntityDates(response, [
    'completedAt'
  ])
}

export function normalizeTaskProgress(progress: TaskProgress): TaskProgress {
  return normalizeEntityDates(progress, [
    'lastUpdated'
  ])
}

export function normalizeCompetencyRating(rating: CompetencyRating): CompetencyRating {
  return normalizeEntityDates(rating, [
    'setAt'
  ])
}

export function normalizeAuditLog(log: AuditLog): AuditLog {
  return normalizeEntityDates(log, [
    'performedAt'
  ])
}

export function normalizeInvitation(invitation: Invitation): Invitation {
  return normalizeEntityDates(invitation, [
    'invitedAt',
    'expiresAt',
    'acceptedAt',
    'declinedAt'
  ])
}

export function normalizeCarerPackageAssignment(assignment: CarerPackageAssignment): CarerPackageAssignment {
  return normalizeEntityDates(assignment, [
    'assignedAt'
  ])
}

export function normalizePackageTaskAssignment(assignment: PackageTaskAssignment): PackageTaskAssignment {
  return normalizeEntityDates(assignment, [
    'assignedAt'
  ])
}

// Array normalizers
export function normalizeAdminUsers(users: AdminUser[]): NormalizedAdminUser[] {
  return users.map(normalizeAdminUser)
}

export function normalizeCarers(carers: Carer[]): NormalizedCarer[] {
  return carers.map(normalizeCarer)
}

export function normalizeCarePackages(packages: CarePackage[]): NormalizedCarePackage[] {
  return packages.map(normalizeCarePackage)
}

export function normalizeTasks(tasks: Task[]): NormalizedTask[] {
  return tasks.map(normalizeTask)
}

export function normalizeAssessments(assessments: Assessment[]): NormalizedAssessment[] {
  return assessments.map(normalizeAssessment)
}

// Generic array normalizer
export function normalizeArray<T extends Record<string, any>>(
  items: T[],
  dateFields: (keyof T)[],
  normalizer?: (item: T) => T
): T[] {
  if (!Array.isArray(items)) return items

  return items.map(item => {
    const normalized = normalizer ? normalizer(item) : normalizeEntityDates(item, dateFields)
    return normalized
  })
}

// Deep normalization for complex objects with nested dates
export function deepNormalizeDates(
  obj: any,
  entityDateFields: Record<string, string[]>
): any {
  if (!obj || typeof obj !== 'object') return obj

  const normalized = { ...obj }

  // Normalize root level dates
  if ('createdAt' in normalized) {
    normalized.createdAt = parseDate(normalized.createdAt as DateLike)
  }
  if ('updatedAt' in normalized) {
    normalized.updatedAt = parseDate(normalized.updatedAt as DateLike)
  }
  if ('deletedAt' in normalized) {
    normalized.deletedAt = parseDate(normalized.deletedAt as DateLike)
  }

  // Normalize nested entities
  for (const [key, dateFields] of Object.entries(entityDateFields)) {
    if (key in normalized) {
      const value = normalized[key]
      if (Array.isArray(value)) {
        normalized[key] = value.map(item => 
          normalizeEntityDates(item, dateFields as any[])
        )
      } else if (value && typeof value === 'object') {
        normalized[key] = normalizeEntityDates(value, dateFields as any[])
      }
    }
  }

  return normalized
}

// Predefined deep normalization configurations for common API responses
export const NORMALIZATION_CONFIGS = {
  carerWithProgress: {
    packages: ['assignedAt'],
    progress: ['lastUpdated'],
    competencies: ['setAt'],
    assessmentResponses: ['completedAt']
  },
  packageWithAssignments: {
    carers: ['assignedAt'],
    tasks: ['assignedAt', 'createdAt', 'updatedAt', 'deletedAt']
  },
  assessmentWithResponses: {
    responses: ['completedAt'],
    knowledgeQuestions: [],
    practicalSkills: [],
    emergencyQuestions: [],
    tasksCovered: []
  }
}

// Export the normalization service
export class DataNormalizationService {
  // Main normalization method
  static normalize(
    data: any,
    entityType: 'adminUser' | 'carer' | 'carePackage' | 'task' | 'assessment' | 'assessmentResponse'
  ): any {
    switch (entityType) {
      case 'adminUser':
        return normalizeAdminUser(data as AdminUser)
      case 'carer':
        return normalizeCarer(data as Carer)
      case 'carePackage':
        return normalizeCarePackage(data as CarePackage)
      case 'task':
        return normalizeTask(data as Task)
      case 'assessment':
        return normalizeAssessment(data as Assessment)
      case 'assessmentResponse':
        return normalizeAssessmentResponse(data as AssessmentResponse)
      default:
        return data
    }
  }

  // Array normalization
  static normalizeArray(
    data: any[],
    entityType: 'adminUser' | 'carer' | 'carePackage' | 'task' | 'assessment' | 'assessmentResponse'
  ): any[] {
    if (!Array.isArray(data)) return data

    return data.map(item => this.normalize(item, entityType))
  }
}