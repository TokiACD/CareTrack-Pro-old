// System Constants
export const SYSTEM_CONSTANTS = {
  POSTCODE_LENGTH: 3,
  WEEKLY_HOUR_LIMIT: 36,
  RECYCLE_BIN_RETENTION_DAYS: 30,
  MIN_COMPETENT_STAFF: 1,
  ASSESSMENT_COMPLETION_THRESHOLD: 90,
  MAX_CONCURRENT_ADMINS: 10,
  SESSION_TIMEOUT_HOURS: 8,
  PASSWORD_MIN_LENGTH: 8,
  REST_PERIOD_HOURS_NIGHT_TO_DAY: 48,
  MAX_CONSECUTIVE_NIGHTS: 7
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    LOGOUT: '/api/auth/logout',
    INVITE: '/api/auth/invite',
    VERIFY_TOKEN: '/api/auth/verify'
  },
  INVITATIONS: {
    SEND_ADMIN: '/api/invitations/admin',
    SEND_CARER: '/api/invitations/carer',
    ACCEPT: '/api/invitations/accept',
    DECLINE: '/api/invitations/decline',
    LIST: '/api/invitations',
    RESEND: '/api/invitations/resend'
  },
  USERS: {
    ADMINS: '/api/users/admins',
    CARERS: '/api/users/carers',
    CREATE_ADMIN: '/api/users/admins',
    CREATE_CARER: '/api/users/carers',
    UPDATE_ADMIN: '/api/users/admins',
    UPDATE_CARER: '/api/users/carers',
    DELETE_ADMIN: '/api/users/admins',
    DELETE_CARER: '/api/users/carers'
  },
  ADMIN_USERS: {
    LIST: '/api/admin-users',
    CREATE: '/api/admin-users',
    UPDATE: '/api/admin-users',
    DELETE: '/api/admin-users',
    RESTORE: '/api/admin-users/restore'
  },
  CARERS: {
    LIST: '/api/carers',
    CREATE: '/api/carers',
    UPDATE: '/api/carers',
    DELETE: '/api/carers',
    RESTORE: '/api/carers/restore',
    PROGRESS: '/api/carers/:id/progress',
    COMPETENCIES: '/api/carers/:id/competencies'
  },
  CARE_PACKAGES: {
    LIST: '/api/care-packages',
    CREATE: '/api/care-packages',
    UPDATE: '/api/care-packages',
    DELETE: '/api/care-packages',
    RESTORE: '/api/care-packages/restore'
  },
  TASKS: {
    LIST: '/api/tasks',
    CREATE: '/api/tasks',
    UPDATE: '/api/tasks',
    DELETE: '/api/tasks',
    RESTORE: '/api/tasks/restore'
  },
  ASSIGNMENTS: {
    CARER_TO_PACKAGE: '/api/assignments/carer-package',
    TASK_TO_PACKAGE: '/api/assignments/task-package',
    LIST: '/api/assignments'
  },
  ASSESSMENTS: {
    LIST: '/api/assessments',
    CREATE: '/api/assessments',
    UPDATE: '/api/assessments',
    DELETE: '/api/assessments',
    SUBMIT_RESPONSE: '/api/assessments/:id/responses'
  },
  PROGRESS: {
    UPDATE: '/api/progress/update',
    BULK_UPDATE: '/api/progress/bulk-update',
    GENERATE_PDF: '/api/progress/:carerId/pdf'
  },
  SHIFTS: {
    LIST: '/api/shifts',
    CREATE: '/api/shifts',
    SEND: '/api/shifts/send'
  },
  ROTA: {
    LIST: '/api/rota',
    CREATE: '/api/rota',
    UPDATE: '/api/rota',
    DELETE: '/api/rota',
    VALIDATE: '/api/rota/validate'
  },
  RECYCLE_BIN: {
    LIST: '/api/recycle-bin',
    RESTORE: '/api/recycle-bin/restore',
    PERMANENT_DELETE: '/api/recycle-bin/permanent-delete',
    CLEANUP: '/api/recycle-bin/cleanup'
  },
  AUDIT: {
    LIST: '/api/audit',
    EXPORT: '/api/audit/export'
  },
  DASHBOARD: {
    SUMMARY: '/api/dashboard/summary'
  }
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Session has expired. Please log in again.',
    UNAUTHORIZED: 'You are not authorized to perform this action',
    INVITE_FAILED: 'Failed to send invitation email'
  },
  INVITATIONS: {
    INVALID_TOKEN: 'Invalid or expired invitation token',
    ALREADY_ACCEPTED: 'This invitation has already been accepted',
    EXPIRED: 'This invitation has expired',
    EMAIL_EXISTS: 'An account with this email already exists',
    SEND_FAILED: 'Failed to send invitation email'
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_POSTCODE: 'Postcode must be exactly 3 digits',
    INVALID_PHONE: 'Please enter a valid phone number',
    TARGET_COUNT_MIN: 'Target count must be at least 1'
  },
  SYSTEM: {
    NETWORK_ERROR: 'Network error. Please check your connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
    NOT_FOUND: 'The requested resource was not found',
    DUPLICATE_EMAIL: 'An account with this email already exists'
  },
  SCHEDULING: {
    HOUR_LIMIT_EXCEEDED: 'Weekly hour limit of 36 hours exceeded',
    NO_COMPETENT_STAFF: 'At least one competent staff member must be scheduled',
    INSUFFICIENT_REST: 'Insufficient rest period between shifts',
    CONSECUTIVE_WEEKENDS: 'Cannot schedule consecutive weekends',
    INVALID_ROTATION: 'Rotation pattern violation detected'
  },
  SOFT_DELETE: {
    HAS_DEPENDENCIES: 'Cannot delete: item has dependencies',
    ALREADY_DELETED: 'Item is already deleted',
    RESTORE_CONFLICTS: 'Cannot restore: conflicts detected'
  }
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  AUTH: {
    LOGIN_SUCCESS: 'Successfully logged in',
    LOGOUT_SUCCESS: 'Successfully logged out',
    INVITE_SENT: 'Invitation sent successfully'
  },
  CRUD: {
    CREATED: 'Created successfully',
    UPDATED: 'Updated successfully',
    DELETED: 'Deleted successfully',
    RESTORED: 'Restored successfully'
  },
  ASSESSMENT: {
    SUBMITTED: 'Assessment submitted successfully',
    COMPETENCY_UPDATED: 'Competency rating updated'
  },
  SHIFT: {
    SENT: 'Shift sent to carers successfully'
  },
  ROTA: {
    SCHEDULED: 'Shift scheduled successfully',
    UPDATED: 'Schedule updated successfully'
  }
} as const;

// Scheduling Rules
export const SCHEDULING_RULES = {
  WEEKLY_HOUR_LIMIT: 36,
  MIN_COMPETENT_STAFF: 1,
  REST_PERIOD_NIGHT_TO_DAY: 48, // hours
  MAX_CONSECUTIVE_WEEKENDS: 1,
  ROTATION_WEEKS: 2 // 1 week days, then 1 week nights
} as const;