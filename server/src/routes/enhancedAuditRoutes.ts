import { Router } from 'express'
import { body, query, param } from 'express-validator'
import { EnhancedAuditController } from '../controllers/EnhancedAuditController'
import { validateRequest } from '../middleware/validateRequest'
import { requireAuth } from '../middleware/auth'

const router = Router()
const enhancedAuditController = new EnhancedAuditController()

// All routes require authentication
router.use(requireAuth)

// GET /api/enhanced-audit/dashboard - Get comprehensive audit dashboard
router.get(
  '/dashboard',
  enhancedAuditController.getAuditDashboard
)

// GET /api/enhanced-audit/activity-feed - Get real-time activity feed
router.get(
  '/activity-feed',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('action')
      .optional()
      .isString()
      .withMessage('Action must be a string'),
    query('entityType')
      .optional()
      .isString()
      .withMessage('Entity type must be a string'),
    query('severity')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid severity level'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO 8601 date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO 8601 date')
  ],
  validateRequest,
  enhancedAuditController.getActivityFeed
)

// GET /api/enhanced-audit/security-monitoring - Get security monitoring data
router.get(
  '/security-monitoring',
  [
    query('timeframe')
      .optional()
      .isIn(['1h', '24h', '7d', '30d'])
      .withMessage('Invalid timeframe')
  ],
  validateRequest,
  enhancedAuditController.getSecurityMonitoring
)

// GET /api/enhanced-audit/alerts - Get security alerts
router.get(
  '/alerts',
  [
    query('acknowledged')
      .optional()
      .isBoolean()
      .withMessage('Acknowledged must be a boolean'),
    query('severity')
      .optional()
      .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
      .withMessage('Invalid severity level'),
    query('type')
      .optional()
      .isIn(['SECURITY', 'COMPLIANCE', 'SYSTEM', 'DATA_INTEGRITY'])
      .withMessage('Invalid alert type')
  ],
  validateRequest,
  enhancedAuditController.getAlerts
)

// PUT /api/enhanced-audit/alerts/:alertId/acknowledge - Acknowledge an alert
router.put(
  '/alerts/:alertId/acknowledge',
  [
    param('alertId')
      .isUUID()
      .withMessage('Alert ID must be a valid UUID')
  ],
  validateRequest,
  enhancedAuditController.acknowledgeAlert
)

// GET /api/enhanced-audit/compliance-report - Generate compliance report
router.get(
  '/compliance-report',
  [
    query('startDate')
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv')
  ],
  validateRequest,
  enhancedAuditController.generateComplianceReport
)

// GET /api/enhanced-audit/users/:userId/activity - Get user activity summary
router.get(
  '/users/:userId/activity',
  [
    param('userId')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    query('timeframe')
      .optional()
      .isIn(['7d', '30d', '90d'])
      .withMessage('Invalid timeframe')
  ],
  validateRequest,
  enhancedAuditController.getUserActivitySummary
)

// GET /api/enhanced-audit/export - Export enhanced audit logs
router.get(
  '/export',
  [
    query('format')
      .optional()
      .isIn(['json', 'csv'])
      .withMessage('Format must be json or csv'),
    query('includeSecurityEvents')
      .optional()
      .isBoolean()
      .withMessage('Include security events must be a boolean'),
    query('dateFrom')
      .optional()
      .isISO8601()
      .withMessage('Date from must be a valid ISO 8601 date'),
    query('dateTo')
      .optional()
      .isISO8601()
      .withMessage('Date to must be a valid ISO 8601 date')
  ],
  validateRequest,
  enhancedAuditController.exportEnhancedAuditLogs
)

export { router as enhancedAuditRoutes }