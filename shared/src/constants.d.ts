export declare const SYSTEM_CONSTANTS: {
    readonly POSTCODE_MAX_LENGTH: 4;
    readonly WEEKLY_HOUR_LIMIT: 36;
    readonly RECYCLE_BIN_RETENTION_DAYS: 30;
    readonly MIN_COMPETENT_STAFF: 1;
    readonly ASSESSMENT_COMPLETION_THRESHOLD: 90;
    readonly MAX_CONCURRENT_ADMINS: 10;
    readonly SESSION_TIMEOUT_HOURS: 8;
    readonly PASSWORD_MIN_LENGTH: 8;
    readonly REST_PERIOD_HOURS_NIGHT_TO_DAY: 48;
    readonly MAX_CONSECUTIVE_NIGHTS: 7;
};
export declare const API_ENDPOINTS: {
    readonly AUTH: {
        readonly LOGIN: "/api/auth/login";
        readonly LOGOUT: "/api/auth/logout";
        readonly INVITE: "/api/auth/invite";
        readonly VERIFY_TOKEN: "/api/auth/verify";
        readonly FORGOT_PASSWORD: "/api/auth/forgot-password";
        readonly RESET_PASSWORD: "/api/auth/reset-password";
    };
    readonly INVITATIONS: {
        readonly SEND_ADMIN: "/api/invitations/admin";
        readonly SEND_CARER: "/api/invitations/carer";
        readonly ACCEPT: "/api/invitations/accept";
        readonly DECLINE: "/api/invitations/decline";
        readonly LIST: "/api/invitations";
        readonly RESEND: "/api/invitations/resend";
        readonly DELETE: "/api/invitations";
    };
    readonly USERS: {
        readonly ADMINS: "/api/users/admins";
        readonly CARERS: "/api/users/carers";
        readonly CREATE_ADMIN: "/api/users/admins";
        readonly CREATE_CARER: "/api/users/carers";
        readonly UPDATE_ADMIN: "/api/users/admins";
        readonly UPDATE_CARER: "/api/users/carers";
        readonly DELETE_ADMIN: "/api/users/admins";
        readonly DELETE_CARER: "/api/users/carers";
    };
    readonly ADMIN_USERS: {
        readonly LIST: "/api/admin-users";
        readonly CREATE: "/api/admin-users";
        readonly UPDATE: "/api/admin-users";
        readonly DELETE: "/api/admin-users";
        readonly RESTORE: "/api/admin-users/restore";
    };
    readonly CARERS: {
        readonly LIST: "/api/carers";
        readonly CREATE: "/api/carers";
        readonly UPDATE: "/api/carers";
        readonly DELETE: "/api/carers";
        readonly RESTORE: "/api/carers/restore";
        readonly PROGRESS: "/api/carers/:id/progress";
        readonly COMPETENCIES: "/api/carers/:id/competencies";
    };
    readonly CARE_PACKAGES: {
        readonly LIST: "/api/care-packages";
        readonly CREATE: "/api/care-packages";
        readonly UPDATE: "/api/care-packages";
        readonly DELETE: "/api/care-packages";
        readonly RESTORE: "/api/care-packages/restore";
    };
    readonly TASKS: {
        readonly LIST: "/api/tasks";
        readonly CREATE: "/api/tasks";
        readonly UPDATE: "/api/tasks";
        readonly DELETE: "/api/tasks";
        readonly RESTORE: "/api/tasks";
    };
    readonly ASSIGNMENTS: {
        readonly LIST: "/api/assignments";
        readonly SUMMARY: "/api/assignments/summary";
        readonly CARER_TO_PACKAGE: "/api/assignments/carer-package";
        readonly TASK_TO_PACKAGE: "/api/assignments/task-package";
        readonly AVAILABLE_CARERS: "/api/assignments/packages";
        readonly AVAILABLE_TASKS: "/api/assignments/packages";
    };
    readonly ASSESSMENTS: {
        readonly LIST: "/api/assessments";
        readonly CREATE: "/api/assessments";
        readonly UPDATE: "/api/assessments";
        readonly DELETE: "/api/assessments";
        readonly SUBMIT_RESPONSE: "/api/assessments/:id/responses";
    };
    readonly PROGRESS: {
        readonly LIST: "/api/progress";
        readonly UPDATE: "/api/progress/update";
        readonly BULK_UPDATE: "/api/progress/bulk-update";
        readonly GENERATE_PDF: "/api/progress/:carerId/pdf";
    };
    readonly SHIFTS: {
        readonly LIST: "/api/shifts";
        readonly CREATE: "/api/shifts";
        readonly SEND: "/api/shifts/send";
    };
    readonly SHIFT_SENDER: {
        readonly CREATE_SHIFT: "/api/shift-sender/shifts";
        readonly SEND_TO_CARERS: "/api/shift-sender/shifts/:shiftId/send";
        readonly GET_APPLICATIONS: "/api/shift-sender/shifts/:shiftId/applications";
        readonly SELECT_CARER: "/api/shift-sender/select-carer";
        readonly SENT_SHIFTS: "/api/shift-sender/shifts";
        readonly CHECK_AVAILABILITY: "/api/shift-sender/check-availability";
    };
    readonly ROTA: {
        readonly LIST: "/api/rota";
        readonly CREATE: "/api/rota";
        readonly UPDATE: "/api/rota";
        readonly DELETE: "/api/rota";
        readonly BATCH_DELETE: "/api/rota/batch";
        readonly GET_BY_ID: "/api/rota/:id";
        readonly WEEKLY_SCHEDULE: "/api/rota/weekly";
        readonly BULK_CREATE: "/api/rota/bulk";
        readonly VALIDATE: "/api/rota/validate";
        readonly CONFIRM: "/api/rota/:id/confirm";
        readonly EXPORT_EXCEL: "/api/rota/export/excel";
        readonly EXPORT_EMAIL: "/api/rota/export/email";
        readonly EXPORT_ARCHIVE: "/api/rota/export/archive";
    };
    readonly RECYCLE_BIN: {
        readonly LIST: "/api/recycle-bin";
        readonly SUMMARY: "/api/recycle-bin/summary";
        readonly RESTORE: "/api/recycle-bin/restore";
        readonly PERMANENT_DELETE: "/api/recycle-bin/permanent-delete";
        readonly CLEANUP: "/api/recycle-bin/cleanup";
        readonly BULK_RESTORE: "/api/recycle-bin/bulk-restore";
        readonly BULK_DELETE: "/api/recycle-bin/bulk-delete";
        readonly IMPACT_ANALYSIS: "/api/recycle-bin/impact-analysis";
    };
    readonly AUDIT: {
        readonly LIST: "/api/audit";
        readonly EXPORT: "/api/audit/export";
    };
    readonly ENHANCED_AUDIT: {
        readonly DASHBOARD: "/api/enhanced-audit/dashboard";
        readonly ACTIVITY_FEED: "/api/enhanced-audit/activity-feed";
        readonly SECURITY_MONITORING: "/api/enhanced-audit/security-monitoring";
        readonly ALERTS: "/api/enhanced-audit/alerts";
        readonly ACKNOWLEDGE_ALERT: "/api/enhanced-audit/alerts/:alertId/acknowledge";
        readonly COMPLIANCE_REPORT: "/api/enhanced-audit/compliance-report";
        readonly USER_ACTIVITY: "/api/enhanced-audit/users/:userId/activity";
        readonly EXPORT: "/api/enhanced-audit/export";
    };
    readonly DASHBOARD: {
        readonly SUMMARY: "/api/dashboard/summary";
    };
    readonly EMAIL_CHANGE: {
        readonly REQUEST: "/api/email-change/request";
        readonly VERIFY: "/api/email-change/verify";
        readonly CANCEL: "/api/email-change/cancel";
        readonly DETAILS: "/api/email-change/details";
    };
};
export declare const ERROR_MESSAGES: {
    readonly AUTH: {
        readonly INVALID_CREDENTIALS: "Invalid email or password";
        readonly TOKEN_EXPIRED: "Session has expired. Please log in again.";
        readonly UNAUTHORIZED: "You are not authorized to perform this action";
        readonly INVITE_FAILED: "Failed to send invitation email";
    };
    readonly INVITATIONS: {
        readonly INVALID_TOKEN: "Invalid or expired invitation token";
        readonly ALREADY_ACCEPTED: "This invitation has already been accepted";
        readonly EXPIRED: "This invitation has expired";
        readonly EMAIL_EXISTS: "An account with this email already exists";
        readonly SEND_FAILED: "Failed to send invitation email";
    };
    readonly VALIDATION: {
        readonly REQUIRED_FIELD: "This field is required";
        readonly INVALID_EMAIL: "Please enter a valid email address";
        readonly INVALID_POSTCODE: "Please enter a valid UK postcode area (e.g., SW1A, M1, B33, E14)";
        readonly TARGET_COUNT_MIN: "Target count must be at least 1";
    };
    readonly SYSTEM: {
        readonly NETWORK_ERROR: "Network error. Please check your connection.";
        readonly SERVER_ERROR: "Server error. Please try again later.";
        readonly NOT_FOUND: "The requested resource was not found";
        readonly DUPLICATE_EMAIL: "An account with this email already exists";
    };
    readonly SCHEDULING: {
        readonly HOUR_LIMIT_EXCEEDED: "Weekly hour limit of 36 hours exceeded";
        readonly NO_COMPETENT_STAFF: "At least one competent staff member must be scheduled";
        readonly INSUFFICIENT_REST: "Insufficient rest period between shifts";
        readonly CONSECUTIVE_WEEKENDS: "Cannot schedule consecutive weekends";
        readonly INVALID_ROTATION: "Rotation pattern violation detected";
    };
    readonly SOFT_DELETE: {
        readonly HAS_DEPENDENCIES: "Cannot delete: item has dependencies";
        readonly ALREADY_DELETED: "Item is already deleted";
        readonly RESTORE_CONFLICTS: "Cannot restore: conflicts detected";
    };
};
export declare const SUCCESS_MESSAGES: {
    readonly AUTH: {
        readonly LOGIN_SUCCESS: "Successfully logged in";
        readonly LOGOUT_SUCCESS: "Successfully logged out";
        readonly INVITE_SENT: "Invitation sent successfully";
    };
    readonly CRUD: {
        readonly CREATED: "Created successfully";
        readonly UPDATED: "Updated successfully";
        readonly DELETED: "Deleted successfully";
        readonly RESTORED: "Restored successfully";
    };
    readonly ASSESSMENT: {
        readonly SUBMITTED: "Assessment submitted successfully";
        readonly COMPETENCY_UPDATED: "Competency rating updated";
    };
    readonly SHIFT: {
        readonly SENT: "Shift sent to carers successfully";
    };
    readonly ROTA: {
        readonly SCHEDULED: "Shift scheduled successfully";
        readonly UPDATED: "Schedule updated successfully";
    };
};
export declare const SCHEDULING_RULES: {
    readonly WEEKLY_HOUR_LIMIT: 36;
    readonly MIN_COMPETENT_STAFF: 1;
    readonly REST_PERIOD_NIGHT_TO_DAY: 48;
    readonly MAX_CONSECUTIVE_WEEKENDS: 1;
    readonly ROTATION_WEEKS: 2;
};
//# sourceMappingURL=constants.d.ts.map