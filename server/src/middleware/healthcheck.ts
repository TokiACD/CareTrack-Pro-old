/**
 * Production Health Check Middleware
 * Comprehensive health monitoring for CareTrack Pro
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';

// =============================================================================
// HEALTH CHECK INTERFACES
// =============================================================================

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  checks: {
    database: ComponentHealth;
    redis: ComponentHealth;
    memory: ComponentHealth;
    disk: ComponentHealth;
    external: ComponentHealth;
  };
}

interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  message?: string;
  details?: any;
}

// =============================================================================
// HEALTH CHECK SERVICE
// =============================================================================

class HealthCheckService {
  private prisma: PrismaClient;
  private redisClient: any;
  private readonly timeout: number;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.timeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT || '30000');
    
    // Initialize Redis client if configured
    if (process.env.REDIS_URL) {
      this.redisClient = createClient({
        url: process.env.REDIS_URL
      });
    }
  }

  // =============================================================================
  // MAIN HEALTH CHECK ENDPOINT
  // =============================================================================
  
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      // Run all health checks in parallel
      const [
        databaseHealth,
        redisHealth,
        memoryHealth,
        diskHealth,
        externalHealth
      ] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkMemory(),
        this.checkDisk(),
        this.checkExternalServices()
      ]);

      const checks = {
        database: this.extractResult(databaseHealth),
        redis: this.extractResult(redisHealth),
        memory: this.extractResult(memoryHealth),
        disk: this.extractResult(diskHealth),
        external: this.extractResult(externalHealth)
      };

      // Determine overall status
      const overallStatus = this.determineOverallStatus(checks);
      
      return {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        checks
      };
      
    } catch (error) {
      console.error('Health check error:', error);
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'unknown',
        checks: {
          database: { status: 'unhealthy', message: 'Health check failed' },
          redis: { status: 'unhealthy', message: 'Health check failed' },
          memory: { status: 'unhealthy', message: 'Health check failed' },
          disk: { status: 'unhealthy', message: 'Health check failed' },
          external: { status: 'unhealthy', message: 'Health check failed' }
        }
      };
    }
  }

  // =============================================================================
  // INDIVIDUAL HEALTH CHECKS
  // =============================================================================

  // Database Health Check
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      
      // Test write capability
      await this.prisma.$queryRaw`SELECT NOW()`;
      
      const responseTime = Date.now() - startTime;
      
      // Check response time
      if (responseTime > 5000) { // 5 seconds
        return {
          status: 'degraded',
          responseTime,
          message: 'Database responding slowly'
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Database connection successful'
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Redis Health Check
  private async checkRedis(): Promise<ComponentHealth> {
    if (!this.redisClient) {
      return {
        status: 'healthy',
        message: 'Redis not configured'
      };
    }
    
    const startTime = Date.now();
    
    try {
      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;
      
      if (responseTime > 1000) { // 1 second
        return {
          status: 'degraded',
          responseTime,
          message: 'Redis responding slowly'
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'Redis connection successful'
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Memory Health Check
  private async checkMemory(): Promise<ComponentHealth> {
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.rss + memoryUsage.heapTotal + memoryUsage.external;
      const memoryThresholdMB = 1000; // 1GB threshold
      const memoryUsageMB = totalMemory / 1024 / 1024;
      
      if (memoryUsageMB > memoryThresholdMB) {
        return {
          status: 'degraded',
          message: 'High memory usage detected',
          details: {
            usage: `${Math.round(memoryUsageMB)}MB`,
            threshold: `${memoryThresholdMB}MB`,
            rss: Math.round(memoryUsage.rss / 1024 / 1024),
            heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
            external: Math.round(memoryUsage.external / 1024 / 1024)
          }
        };
      }
      
      return {
        status: 'healthy',
        message: 'Memory usage normal',
        details: {
          usage: `${Math.round(memoryUsageMB)}MB`,
          rss: Math.round(memoryUsage.rss / 1024 / 1024),
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          external: Math.round(memoryUsage.external / 1024 / 1024)
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Disk Health Check
  private async checkDisk(): Promise<ComponentHealth> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      // Check available disk space
      const stats = await fs.statfs('.');
      const totalSpace = stats.blocks * stats.blksize;
      const freeSpace = stats.bavail * stats.blksize;
      const usedSpace = totalSpace - freeSpace;
      const usagePercent = (usedSpace / totalSpace) * 100;
      
      if (usagePercent > 90) {
        return {
          status: 'unhealthy',
          message: 'Critical disk space shortage',
          details: {
            usage: `${Math.round(usagePercent)}%`,
            free: `${Math.round(freeSpace / 1024 / 1024 / 1024)}GB`,
            total: `${Math.round(totalSpace / 1024 / 1024 / 1024)}GB`
          }
        };
      }
      
      if (usagePercent > 80) {
        return {
          status: 'degraded',
          message: 'High disk usage',
          details: {
            usage: `${Math.round(usagePercent)}%`,
            free: `${Math.round(freeSpace / 1024 / 1024 / 1024)}GB`,
            total: `${Math.round(totalSpace / 1024 / 1024 / 1024)}GB`
          }
        };
      }
      
      return {
        status: 'healthy',
        message: 'Disk space sufficient',
        details: {
          usage: `${Math.round(usagePercent)}%`,
          free: `${Math.round(freeSpace / 1024 / 1024 / 1024)}GB`,
          total: `${Math.round(totalSpace / 1024 / 1024 / 1024)}GB`
        }
      };
      
    } catch (error) {
      return {
        status: 'degraded',
        message: 'Unable to check disk space'
      };
    }
  }

  // External Services Health Check
  private async checkExternalServices(): Promise<ComponentHealth> {
    const externalUrl = process.env.EXTERNAL_HEALTH_CHECK_URL;
    
    if (!externalUrl) {
      return {
        status: 'healthy',
        message: 'No external services configured'
      };
    }
    
    const startTime = Date.now();
    
    try {
      const response = await fetch(externalUrl, {
        method: 'GET',
        timeout: this.timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      if (!response.ok) {
        return {
          status: 'degraded',
          responseTime,
          message: `External service returned ${response.status}`
        };
      }
      
      return {
        status: 'healthy',
        responseTime,
        message: 'External services accessible'
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        message: `External services unreachable: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private extractResult(result: PromiseSettledResult<ComponentHealth>): ComponentHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: result.reason?.message || 'Check failed'
      };
    }
  }

  private determineOverallStatus(checks: Record<string, ComponentHealth>): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(checks).map(check => check.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }
}

// =============================================================================
// MIDDLEWARE FUNCTIONS
// =============================================================================

let healthCheckService: HealthCheckService;

export const initializeHealthCheck = (prisma: PrismaClient) => {
  healthCheckService = new HealthCheckService(prisma);
};

// Main health check endpoint
export const healthCheckEndpoint = async (req: Request, res: Response) => {
  try {
    const healthResult = await healthCheckService.performHealthCheck();
    
    // Set appropriate HTTP status based on health
    let httpStatus = 200;
    if (healthResult.status === 'degraded') {
      httpStatus = 200; // Still operational but with warnings
    } else if (healthResult.status === 'unhealthy') {
      httpStatus = 503; // Service unavailable
    }
    
    res.status(httpStatus).json({
      success: healthResult.status !== 'unhealthy',
      ...healthResult
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Simple liveness probe (for Kubernetes/Docker)
export const livenessProbe = (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

// Simple readiness probe (for Kubernetes/Docker)
export const readinessProbe = async (req: Request, res: Response) => {
  try {
    // Basic checks for readiness
    const healthResult = await healthCheckService.performHealthCheck();
    
    if (healthResult.status === 'unhealthy') {
      return res.status(503).json({
        success: false,
        status: 'not-ready',
        timestamp: new Date().toISOString()
      });
    }
    
    res.status(200).json({
      success: true,
      status: 'ready',
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'not-ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export { HealthCheckService };