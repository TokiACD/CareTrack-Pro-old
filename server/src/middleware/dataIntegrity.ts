import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain } from 'express-validator'
import { getPrismaClient, encryptSensitiveData } from '../config/database'
import { auditLogger } from '../services/auditService'

// Data sanitization utilities
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    // Remove potential SQL injection patterns
    return input
      .replace(/[<>\"'%;()&+]/g, '') // Remove dangerous characters
      .trim()
      .substring(0, 10000) // Limit length
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput)
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[sanitizeInput(key)] = sanitizeInput(value)
    }
    return sanitized
  }
  
  return input
}

// PII detection and encryption middleware
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // Field removed - not in schema
  ssn: /\d{3}-?\d{2}-?\d{4}/g,
  creditCard: /\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g,
  ukPostcode: /[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}/gi
}

export const detectAndEncryptPII = (data: any): {
  sanitizedData: any
  piiDetected: boolean
  piiTypes: string[]
} => {
  const piiTypes: string[] = []
  let piiDetected = false
  
  const processValue = (value: any): any => {
    if (typeof value !== 'string') return value
    
    let processedValue = value
    
    // Check for different types of PII
    for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
      if (pattern.test(value)) {
        piiDetected = true
        if (!piiTypes.includes(type)) {
          piiTypes.push(type)
        }
        
        // Mask or encrypt based on type
        if (type === 'email') { // Removed phone validation - field not in schema
          processedValue = encryptSensitiveData(processedValue)
        } else {
          // Mask other sensitive data
          processedValue = processedValue.replace(pattern, '***MASKED***')
        }
      }
    }
    
    return processedValue
  }
  
  const processObject = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(processObject)
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const processed: any = {}
      for (const [key, value] of Object.entries(obj)) {
        processed[key] = processObject(value)
      }
      return processed
    }
    
    return processValue(obj)
  }
  
  return {
    sanitizedData: processObject(data),
    piiDetected,
    piiTypes
  }
}

// Data integrity validation middleware
export const validateDataIntegrity = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Run validations
      await Promise.all(validations.map(validation => validation.run(req)))
      
      const errors = validationResult(req)
      if (!errors.isEmpty()) {
        await auditLogger.logSecurityEvent({
          action: 'DATA_VALIDATION_FAILED',
          entityType: 'REQUEST',
          entityId: req.ip || 'unknown',
          severity: 'WARN',
          details: {
            errors: errors.array(),
            path: req.path,
            method: req.method
          },
          performedByAdminId: req.user?.id || 'system',
          performedByAdminName: req.user?.name || 'system',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
        
        return res.status(400).json({
          success: false,
          error: 'Data validation failed',
          details: errors.array()
        })
      }
      
      // Sanitize input data
      if (req.body) {
        req.body = sanitizeInput(req.body)
      }
      
      if (req.query) {
        req.query = sanitizeInput(req.query)
      }
      
      if (req.params) {
        req.params = sanitizeInput(req.params)
      }
      
      // Check for PII and encrypt if necessary
      if (req.body) {
        const { sanitizedData, piiDetected, piiTypes } = detectAndEncryptPII(req.body)
        req.body = sanitizedData
        
        if (piiDetected) {
          await auditLogger.logSecurityEvent({
            action: 'PII_DETECTED',
            entityType: 'REQUEST',
            entityId: req.ip || 'unknown',
            severity: 'INFO',
            details: {
              piiTypes,
              path: req.path,
              method: req.method
            },
            performedByAdminId: req.user?.id || 'system',
            performedByAdminName: req.user?.name || 'system',
            ipAddress: req.ip,
            userAgent: req.get('user-agent')
          })
        }
      }
      
      next()
    } catch (error) {
      await auditLogger.logSecurityEvent({
        action: 'DATA_INTEGRITY_ERROR',
        entityType: 'REQUEST',
        entityId: req.ip || 'unknown',
        severity: 'ERROR',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path,
          method: req.method
        },
        performedByAdminId: req.user?.id || 'system',
        performedByAdminName: req.user?.name || 'system',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
      
      next(error)
    }
  }
}

// Soft delete middleware
export const softDeleteMiddleware = (modelName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const prisma = getPrismaClient()
    
    if (req.method === 'DELETE') {
      try {
        const { id } = req.params
        
        // Check if model supports soft delete
        const model = (prisma as any)[modelName]
        if (!model) {
          return res.status(400).json({
            success: false,
            error: 'Invalid model'
          })
        }
        
        // Perform soft delete instead of hard delete
        const result = await model.update({
          where: { id },
          data: {
            deletedAt: new Date(),
            isActive: false
          }
        })
        
        await auditLogger.logDataChange({
          action: 'SOFT_DELETE',
          entityType: modelName.toUpperCase(),
          entityId: id,
          oldValues: null,
          newValues: { deletedAt: new Date(), isActive: false },
          performedByAdminId: req.user?.id || 'system',
          performedByAdminName: req.user?.name || 'system',
          ipAddress: req.ip,
          userAgent: req.get('user-agent')
        })
        
        return res.json({
          success: true,
          data: result,
          message: `${modelName} soft deleted successfully`
        })
        
      } catch (error) {
        console.error(`Soft delete error for ${modelName}:`, error)
        return res.status(500).json({
          success: false,
          error: 'Soft delete failed'
        })
      }
    }
    
    next()
  }
}

// Database constraint validation
export const validateConstraints = async (
  modelName: string,
  operation: 'create' | 'update' | 'delete',
  data: any,
  id?: string
): Promise<{
  isValid: boolean
  violations: string[]
}> => {
  const prisma = getPrismaClient()
  const violations: string[] = []
  
  try {
    // Check referential integrity
    if (operation === 'delete' && id) {
      // Check if record has dependent records
      const dependencyChecks: Record<string, string[]> = {
        adminUser: ['assessmentResponses', 'auditLogs', 'competencyRatings'],
        carer: ['assessmentResponses', 'packageAssignments', 'competencyRatings', 'rotaEntries'],
        carePackage: ['carerAssignments', 'taskAssignments', 'rotaEntries'],
        task: ['competencyRatings', 'packageAssignments', 'taskProgress'],
        assessment: ['assessmentResponses', 'draftResponses']
      }
      
      const dependencies = dependencyChecks[modelName] || []
      const model = (prisma as any)[modelName]
      
      if (model && dependencies.length > 0) {
        const record = await model.findUnique({
          where: { id },
          include: Object.fromEntries(dependencies.map(dep => [dep, { take: 1 }]))
        })
        
        if (record) {
          for (const dependency of dependencies) {
            if (record[dependency]?.length > 0) {
              violations.push(`Cannot delete ${modelName}: has dependent ${dependency}`)
            }
          }
        }
      }
    }
    
    // Check unique constraints
    if (operation === 'create' || operation === 'update') {
      const uniqueConstraints: Record<string, string[]> = {
        adminUser: ['email'],
        carer: ['email'],
        invitation: ['email'],
        passwordResetToken: ['token']
      }
      
      const constraints = uniqueConstraints[modelName] || []
      const model = (prisma as any)[modelName]
      
      if (model && constraints.length > 0) {
        for (const field of constraints) {
          if (data[field]) {
            const whereClause: any = { [field]: data[field] }
            if (operation === 'update' && id) {
              whereClause.NOT = { id }
            }
            
            const existing = await model.findFirst({ where: whereClause })
            if (existing) {
              violations.push(`${field} already exists`)
            }
          }
        }
      }
    }
    
    return {
      isValid: violations.length === 0,
      violations
    }
    
  } catch (error) {
    console.error('Constraint validation error:', error)
    return {
      isValid: false,
      violations: ['Constraint validation failed']
    }
  }
}

// HIPAA compliance middleware
export const hipaaComplianceMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Log all access to PHI (Protected Health Information)
    const phiEndpoints = [
      '/carers',
      '/assessments',
      '/assessment-responses',
      '/audit-logs',
      '/care-packages'
    ]
    
    const isPhiAccess = phiEndpoints.some(endpoint => req.path.includes(endpoint))
    
    if (isPhiAccess) {
      await auditLogger.logSecurityEvent({
        action: 'PHI_ACCESS',
        entityType: 'ENDPOINT',
        entityId: req.path,
        severity: 'INFO',
        details: {
          method: req.method,
          path: req.path,
          query: req.query,
          userAgent: req.get('user-agent')
        },
        performedByAdminId: req.user?.id || 'anonymous',
        performedByAdminName: req.user?.name || 'anonymous',
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      })
    }
    
    // Set compliance headers
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('X-XSS-Protection', '1; mode=block')
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    next()
  } catch (error) {
    console.error('HIPAA compliance middleware error:', error)
    next(error)
  }
}

export default {
  validateDataIntegrity,
  softDeleteMiddleware,
  validateConstraints,
  hipaaComplianceMiddleware,
  sanitizeInput,
  detectAndEncryptPII
}