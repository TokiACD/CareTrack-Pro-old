// UI Constants for CareTrack Pro Client

// Layout and Spacing
export const LAYOUT_CONSTANTS = {
  HEADER_HEIGHT: 64,
  SIDEBAR_WIDTH: 240,
  CONTAINER_MAX_WIDTH: 'lg' as const,
  CARD_ELEVATION: 2,
  DEFAULT_SPACING: 3,
  LARGE_SPACING: 4,
  SMALL_SPACING: 2
} as const;

// Form Constants
export const FORM_CONSTANTS = {
  DEFAULT_TEXT_FIELD_ROWS: 4,
  MULTILINE_ROWS: {
    SMALL: 2,
    MEDIUM: 4,
    LARGE: 6
  },
  VALIDATION_DEBOUNCE_MS: 300,
  AUTO_SAVE_DEBOUNCE_MS: 1000
} as const;

// Table Constants
export const TABLE_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 10,
  PAGE_SIZE_OPTIONS: [10, 25, 50, 100],
  SEARCH_DEBOUNCE_MS: 500,
  ROW_HEIGHT: 64,
  HEADER_HEIGHT: 56
} as const;

// Dialog Constants
export const DIALOG_CONSTANTS = {
  DEFAULT_MAX_WIDTH: 'sm' as const,
  LARGE_MAX_WIDTH: 'md' as const,
  EXTRA_LARGE_MAX_WIDTH: 'lg' as const,
  AUTO_HIDE_DURATION: 6000,
  CLOSE_TRANSITION_DURATION: 300
} as const;

// Animation Constants
export const ANIMATION_CONSTANTS = {
  FAST_TRANSITION: 200,
  NORMAL_TRANSITION: 300,
  SLOW_TRANSITION: 500,
  FADE_DURATION: 150,
  SLIDE_DURATION: 300
} as const;

// Loading Constants
export const LOADING_CONSTANTS = {
  SPINNER_SIZE: {
    SMALL: 20,
    MEDIUM: 24,
    LARGE: 32
  },
  MIN_LOADING_TIME: 500,
  SKELETON_ANIMATION_DURATION: 1500
} as const;

// Notification Constants
export const NOTIFICATION_CONSTANTS = {
  DEFAULT_DURATION: 6000,
  SUCCESS_DURATION: 4000,
  ERROR_DURATION: 8000,
  WARNING_DURATION: 6000,
  MAX_NOTIFICATIONS: 5,
  POSITION: {
    VERTICAL: 'bottom' as const,
    HORIZONTAL: 'right' as const
  }
} as const;

// Assessment Constants
export const ASSESSMENT_CONSTANTS = {
  MAX_QUESTION_LENGTH: 1000,
  MAX_ANSWER_LENGTH: 2000,
  MAX_ACCORDION_ITEMS: 50,
  AUTO_SAVE_INTERVAL_MS: 30000,
  SESSION_TIMEOUT_WARNING_MS: 300000, // 5 minutes
  MAX_FILE_UPLOAD_SIZE: 5 * 1024 * 1024 // 5MB
} as const;

// Stepper Constants
export const STEPPER_CONSTANTS = {
  MAX_STEPS: 10,
  STEP_TRANSITION_DELAY: 100,
  COMPLETION_ANIMATION_DURATION: 1000
} as const;

// Chart Constants
export const CHART_CONSTANTS = {
  DEFAULT_HEIGHT: 300,
  LARGE_HEIGHT: 400,
  PROGRESS_CHART_HEIGHT: 200,
  ANIMATION_DURATION: 750,
  COLORS: {
    PRIMARY: '#1976d2',
    SUCCESS: '#4caf50',
    WARNING: '#ff9800',
    ERROR: '#f44336',
    INFO: '#2196f3'
  }
} as const;

// Grid Constants
export const GRID_CONSTANTS = {
  BREAKPOINTS: {
    XS: 0,
    SM: 600,
    MD: 900,
    LG: 1200,
    XL: 1536
  },
  CONTAINER_SPACING: 3,
  ITEM_SPACING: 2
} as const;

// Search Constants
export const SEARCH_CONSTANTS = {
  MIN_SEARCH_LENGTH: 2,
  MAX_RESULTS: 100,
  DEBOUNCE_DELAY: 300,
  HIGHLIGHT_CLASS: 'search-highlight'
} as const;

// File Upload Constants
export const FILE_CONSTANTS = {
  ACCEPTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  ACCEPTED_DOCUMENT_TYPES: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  CHUNK_SIZE: 1024 * 1024, // 1MB
  MAX_FILES: 10
} as const;

// Validation Constants
export const VALIDATION_CONSTANTS = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UK_POSTCODE_REGEX: /^([A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2})$/i,
  PASSWORD_MIN_LENGTH: 8,
  NAME_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 1000
} as const;

// Theme Constants
export const THEME_CONSTANTS = {
  BORDER_RADIUS: {
    SMALL: 4,
    MEDIUM: 8,
    LARGE: 12
  },
  SHADOWS: {
    LIGHT: '0 1px 3px rgba(0,0,0,0.12)',
    MEDIUM: '0 4px 6px rgba(0,0,0,0.12)',
    HEAVY: '0 10px 15px rgba(0,0,0,0.12)'
  },
  Z_INDEX: {
    DROPDOWN: 1000,
    STICKY: 1020,
    FIXED: 1030,
    MODAL_BACKDROP: 1040,
    MODAL: 1050,
    POPOVER: 1060,
    TOOLTIP: 1070,
    NOTIFICATION: 1080
  }
} as const;

// Accessibility Constants
export const A11Y_CONSTANTS = {
  FOCUS_VISIBLE_OUTLINE: '2px solid #1976d2',
  MIN_TOUCH_TARGET: 44, // pixels
  CONTRAST_RATIOS: {
    NORMAL: 4.5,
    LARGE: 3
  },
  ANIMATION_RESPECT_MOTION: true
} as const;