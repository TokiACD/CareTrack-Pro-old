import { Request, Response, NextFunction } from 'express';
import { auditService } from '../services/auditService';

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE', 
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  RESTORE = 'RESTORE'
}

export interface AuditRequest extends Request {
  admin?: {
    id: string;
    name: string;
    email: string;
  };
  auditData?: {
    action: AuditAction;
    entityType: string;
    entityId?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
  };
}

export function audit(action: AuditAction, entityType: string) {
  return (req: AuditRequest, res: Response, next: NextFunction) => {
    // Store audit data in request for later use
    req.auditData = {
      action,
      entityType
    };

    // Override res.json to capture response data
    const originalJson = res.json;
    res.json = function(body: any) {
      // Log audit data after successful response
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
        const entityId = req.params.id || body?.data?.id || 'unknown';
        
        auditService.log({
          action: req.auditData!.action,
          entityType: req.auditData!.entityType,
          entityId,
          oldValues: req.auditData?.oldValues,
          newValues: req.auditData?.newValues || body?.data,
          performedByAdminId: req.user.id,
          performedByAdminName: req.user.name,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent')
        }).catch(error => {
          console.error('Audit logging failed:', error);
        });
      }

      return originalJson.call(this, body);
    };

    next();
  };
}

export function auditWithOldValues(action: AuditAction, entityType: string, getOldValues: (req: Request) => Promise<Record<string, any>>) {
  return async (req: AuditRequest, res: Response, next: NextFunction) => {
    try {
      // Capture old values before the operation
      const oldValues = await getOldValues(req);
      
      req.auditData = {
        action,
        entityType,
        oldValues
      };

      // Override res.json to capture response data
      const originalJson = res.json;
      res.json = function(body: any) {
        // Log audit data after successful response
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          const entityId = req.params.id || body?.data?.id || 'unknown';
          
          auditService.log({
            action: req.auditData!.action,
            entityType: req.auditData!.entityType,
            entityId,
            oldValues: req.auditData?.oldValues,
            newValues: body?.data,
            performedByAdminId: req.user.id,
            performedByAdminName: req.user.name,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.get('User-Agent')
          }).catch(error => {
            console.error('Audit logging failed:', error);
          });
        }

        return originalJson.call(this, body);
      };

      next();
    } catch (error) {
      console.error('Error in audit middleware:', error);
      next();
    }
  };
}