"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEDULING_RULES = exports.SUCCESS_MESSAGES = exports.ERROR_MESSAGES = exports.API_ENDPOINTS = exports.SYSTEM_CONSTANTS = void 0;
exports.SYSTEM_CONSTANTS = {
    POSTCODE_MAX_LENGTH: 4,
    WEEKLY_HOUR_LIMIT: 36,
    RECYCLE_BIN_RETENTION_DAYS: 30,
    MIN_COMPETENT_STAFF: 1,
    ASSESSMENT_COMPLETION_THRESHOLD: 90,
    MAX_CONCURRENT_ADMINS: 10,
    SESSION_TIMEOUT_HOURS: 8,
    PASSWORD_MIN_LENGTH: 8,
    REST_PERIOD_HOURS_NIGHT_TO_DAY: 48,
    MAX_CONSECUTIVE_NIGHTS: 7
};
exports.API_ENDPOINTS = {
    AUTH: {
        LOGIN: '/api/auth/login',
        LOGOUT: '/api/auth/logout',
        INVITE: '/api/auth/invite',
        VERIFY_TOKEN: '/api/auth/verify',
        FORGOT_PASSWORD: '/api/auth/forgot-password',
        RESET_PASSWORD: '/api/auth/reset-password'
    },
    INVITATIONS: {
        SEND_ADMIN: '/api/invitations/admin',
        SEND_CARER: '/api/invitations/carer',
        ACCEPT: '/api/invitations/accept',
        DECLINE: '/api/invitations/decline',
        LIST: '/api/invitations',
        RESEND: '/api/invitations/resend',
        DELETE: '/api/invitations'
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
        RESTORE: '/api/tasks'
    },
    ASSIGNMENTS: {
        LIST: '/api/assignments',
        SUMMARY: '/api/assignments/summary',
        CARER_TO_PACKAGE: '/api/assignments/carer-package',
        TASK_TO_PACKAGE: '/api/assignments/task-package',
        AVAILABLE_CARERS: '/api/assignments/packages',
        AVAILABLE_TASKS: '/api/assignments/packages'
    },
    ASSESSMENTS: {
        LIST: '/api/assessments',
        CREATE: '/api/assessments',
        UPDATE: '/api/assessments',
        DELETE: '/api/assessments',
        SUBMIT_RESPONSE: '/api/assessments/:id/responses'
    },
    PROGRESS: {
        LIST: '/api/progress',
        UPDATE: '/api/progress/update',
        BULK_UPDATE: '/api/progress/bulk-update',
        GENERATE_PDF: '/api/progress/:carerId/pdf'
    },
    SHIFTS: {
        LIST: '/api/shifts',
        CREATE: '/api/shifts',
        SEND: '/api/shifts/send'
    },
    SHIFT_SENDER: {
        CREATE_SHIFT: '/api/shift-sender/shifts',
        SEND_TO_CARERS: '/api/shift-sender/shifts/:shiftId/send',
        GET_APPLICATIONS: '/api/shift-sender/shifts/:shiftId/applications',
        SELECT_CARER: '/api/shift-sender/select-carer',
        SENT_SHIFTS: '/api/shift-sender/shifts',
        CHECK_AVAILABILITY: '/api/shift-sender/check-availability'
    },
    ROTA: {
        LIST: '/api/rota',
        CREATE: '/api/rota',
        UPDATE: '/api/rota',
        DELETE: '/api/rota',
        BATCH_DELETE: '/api/rota/batch',
        GET_BY_ID: '/api/rota/:id',
        WEEKLY_SCHEDULE: '/api/rota/weekly',
        BULK_CREATE: '/api/rota/bulk',
        VALIDATE: '/api/rota/validate',
        CONFIRM: '/api/rota/:id/confirm',
        EXPORT_EXCEL: '/api/rota/export/excel',
        EXPORT_EMAIL: '/api/rota/export/email',
        EXPORT_ARCHIVE: '/api/rota/export/archive'
    },
    RECYCLE_BIN: {
        LIST: '/api/recycle-bin',
        SUMMARY: '/api/recycle-bin/summary',
        RESTORE: '/api/recycle-bin/restore',
        PERMANENT_DELETE: '/api/recycle-bin/permanent-delete',
        CLEANUP: '/api/recycle-bin/cleanup',
        BULK_RESTORE: '/api/recycle-bin/bulk-restore',
        BULK_DELETE: '/api/recycle-bin/bulk-delete',
        IMPACT_ANALYSIS: '/api/recycle-bin/impact-analysis'
    },
    AUDIT: {
        LIST: '/api/audit',
        EXPORT: '/api/audit/export'
    },
    ENHANCED_AUDIT: {
        DASHBOARD: '/api/enhanced-audit/dashboard',
        ACTIVITY_FEED: '/api/enhanced-audit/activity-feed',
        SECURITY_MONITORING: '/api/enhanced-audit/security-monitoring',
        ALERTS: '/api/enhanced-audit/alerts',
        ACKNOWLEDGE_ALERT: '/api/enhanced-audit/alerts/:alertId/acknowledge',
        COMPLIANCE_REPORT: '/api/enhanced-audit/compliance-report',
        USER_ACTIVITY: '/api/enhanced-audit/users/:userId/activity',
        EXPORT: '/api/enhanced-audit/export'
    },
    DASHBOARD: {
        SUMMARY: '/api/dashboard/summary'
    },
    EMAIL_CHANGE: {
        REQUEST: '/api/email-change/request',
        VERIFY: '/api/email-change/verify',
        CANCEL: '/api/email-change/cancel',
        DETAILS: '/api/email-change/details'
    }
};
exports.ERROR_MESSAGES = {
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
        INVALID_POSTCODE: 'Please enter a valid UK postcode area (e.g., SW1A, M1, B33, E14)',
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
};
exports.SUCCESS_MESSAGES = {
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
};
exports.SCHEDULING_RULES = {
    WEEKLY_HOUR_LIMIT: 36,
    MIN_COMPETENT_STAFF: 1,
    REST_PERIOD_NIGHT_TO_DAY: 48,
    MAX_CONSECUTIVE_WEEKENDS: 1,
    ROTATION_WEEKS: 2
};
//# sourceMappingURL=constants.js.map