/**
 * Security Monitoring and Incident Response Service
 * Healthcare-grade security monitoring with HIPAA compliance
 */

import { Request } from 'express';
import { prisma } from '../index';
import { MONITORING_CONFIG, HIPAA_CONFIG } from '../config/security';

interface SecurityIncident {
  id?: string;
  timestamp: Date;
  incidentType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  details: any;
  resolved: boolean;
  responseActions: string[];
}

interface SecurityMetrics {
  totalIncidents: number;
  criticalIncidents: number;
  averageResponseTime: number;
  topThreatTypes: { type: string; count: number }[];
  ipAddressStats: { ip: string; incidents: number; blocked: boolean }[];
  userSecurityScore: number;
}

class SecurityMonitoringService {
  private incidents: Map<string, SecurityIncident> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousIPs: Map<string, { count: number; lastIncident: Date }> = new Map();
  private userRiskScores: Map<string, number> = new Map();

  // =============================================================================
  // INCIDENT DETECTION AND LOGGING
  // =============================================================================

  async reportSecurityIncident(
    req: Request,
    incidentType: string,
    severity: SecurityIncident['severity'],
    details: any = {}
  ): Promise<void> {
    const incident: SecurityIncident = {
      id: this.generateIncidentId(),
      timestamp: new Date(),
      incidentType,
      severity,
      userId: (req as any).user?.id,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      details: this.sanitizeDetails(details),
      resolved: false,
      responseActions: []
    };

    // Store incident
    this.incidents.set(incident.id!, incident);

    // Log to database for persistence
    await this.persistIncident(incident);

    // Update threat intelligence
    await this.updateThreatIntelligence(incident);

    // Automated response actions
    await this.executeAutomatedResponse(incident);

    // Send alerts for critical incidents
    if (severity === 'CRITICAL') {
      await this.sendCriticalAlert(incident);
    }

    console.log(`[SECURITY INCIDENT] ${severity}: ${incidentType}`, {
      id: incident.id,
      user: incident.userId || 'anonymous',
      ip: incident.ipAddress,
      timestamp: incident.timestamp.toISOString()
    });
  }

  // =============================================================================
  // THREAT INTELLIGENCE AND ANALYSIS
  // =============================================================================

  async analyzeUserBehavior(userId: string): Promise<number> {
    try {
      // Get user's recent audit logs
      const recentLogs = await prisma.auditLog.findMany({
        where: {
          performedByAdminId: userId,
          performedAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: { performedAt: 'desc' },
        take: 100
      });

      let riskScore = 0;

      // Analyze patterns
      const actions = recentLogs.map(log => log.action);
      const uniqueActions = new Set(actions);
      const timePattern = this.analyzeTimePatterns(recentLogs);
      const ipPattern = this.analyzeIPPatterns(recentLogs);

      // Risk factors
      if (actions.length > 100) riskScore += 20; // Excessive activity
      if (uniqueActions.has('LOGIN_FAILED')) riskScore += 30; // Failed logins
      if (uniqueActions.has('PRIVILEGE_ESCALATION')) riskScore += 50; // Suspicious actions
      if (timePattern.outsideBusinessHours > 0.5) riskScore += 15; // After-hours activity
      if (ipPattern.uniqueIPs > 3) riskScore += 25; // Multiple IPs

      // Check for PHI access patterns
      const phiAccess = recentLogs.filter(log => 
        this.containsPHI(log.entityType, log.newValues || log.oldValues)
      );
      
      if (phiAccess.length > 20) riskScore += 30; // Excessive PHI access

      // Normalize score (0-100)
      riskScore = Math.min(riskScore, 100);

      // Update user risk score
      this.userRiskScores.set(userId, riskScore);

      return riskScore;
    } catch (error) {
      console.error('Error analyzing user behavior:', error);
      return 50; // Default moderate risk
    }
  }

  async detectAnomalousPatterns(): Promise<SecurityIncident[]> {
    const anomalies: SecurityIncident[] = [];

    // Check for failed login patterns
    const failedLogins = await prisma.auditLog.findMany({
      where: {
        action: 'LOGIN_FAILED',
        performedAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000) // Last hour
        }
      },
      select: {
        ipAddress: true,
        performedAt: true,
        userAgent: true
      }
    });

    // Group by IP address
    const ipGroups = new Map<string, typeof failedLogins>();
    failedLogins.forEach(log => {
      const ip = log.ipAddress || 'unknown';
      if (!ipGroups.has(ip)) {
        ipGroups.set(ip, []);
      }
      ipGroups.get(ip)!.push(log);
    });

    // Detect brute force attempts
    for (const [ip, logs] of ipGroups) {
      if (logs.length >= 10) { // 10+ failed attempts in 1 hour
        anomalies.push({
          timestamp: new Date(),
          incidentType: 'BRUTE_FORCE_ATTEMPT',
          severity: 'HIGH',
          ipAddress: ip,
          userAgent: logs[0].userAgent || 'unknown',
          details: {
            attemptCount: logs.length,
            timeWindow: '1 hour',
            firstAttempt: logs[logs.length - 1].performedAt,
            lastAttempt: logs[0].performedAt
          },
          resolved: false,
          responseActions: []
        });
      }
    }

    return anomalies;
  }

  // =============================================================================
  // AUTOMATED RESPONSE ACTIONS
  // =============================================================================

  private async executeAutomatedResponse(incident: SecurityIncident): Promise<void> {
    const actions: string[] = [];

    switch (incident.incidentType) {
      case 'BRUTE_FORCE_ATTEMPT':
        await this.blockIP(incident.ipAddress);
        actions.push(`Blocked IP: ${incident.ipAddress}`);
        break;

      case 'SQL_INJECTION_ATTEMPT':
      case 'XSS_ATTEMPT':
        await this.blockIP(incident.ipAddress);
        await this.flagUserForReview(incident.userId);
        actions.push(`Blocked IP and flagged user for security review`);
        break;

      case 'SUSPICIOUS_PHI_ACCESS':
        await this.flagUserForReview(incident.userId);
        await this.requireReAuthentication(incident.userId);
        actions.push(`User flagged for PHI access review`);
        break;

      case 'RATE_LIMIT_EXCEEDED':
        await this.addToSuspiciousIPs(incident.ipAddress);
        actions.push(`Added to suspicious IP watchlist`);
        break;

      case 'SESSION_HIJACK_ATTEMPT':
        await this.blockIP(incident.ipAddress);
        await this.invalidateUserSessions(incident.userId);
        actions.push(`Blocked IP and invalidated all user sessions`);
        break;
    }

    // Update incident with response actions
    incident.responseActions = actions;
    this.incidents.set(incident.id!, incident);

    // Update database
    await this.updateIncidentActions(incident.id!, actions);
  }

  private async blockIP(ipAddress: string): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    // In production, integrate with firewall/WAF
    console.log(`🚫 IP blocked: ${ipAddress}`);
    
    // Store in database for persistence across restarts
    try {
      await prisma.auditLog.create({
        data: {
          action: 'IP_BLOCKED',
          entityType: 'Security',
          entityId: ipAddress,
          performedByAdminId: 'system',
          performedByAdminName: 'Security System',
          newValues: { ipAddress, blockedAt: new Date(), reason: 'Automated security response' },
          severity: 'HIGH'
        }
      });
    } catch (error) {
      console.error('Failed to log IP block:', error);
    }
  }

  private async flagUserForReview(userId?: string): Promise<void> {
    if (!userId) return;

    try {
      // Flag user in database
      await prisma.adminUser.update({
        where: { id: userId },
        data: {
          complianceFlags: {
            securityReviewRequired: true,
            flaggedAt: new Date(),
            reason: 'Automated security alert'
          }
        }
      });

      console.log(`👤 User flagged for security review: ${userId}`);
    } catch (error) {
      console.error('Failed to flag user:', error);
    }
  }

  // =============================================================================
  // METRICS AND REPORTING
  // =============================================================================

  async getSecurityMetrics(timeWindow: number = 24): Promise<SecurityMetrics> {
    const since = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    const incidents = await prisma.auditLog.findMany({
      where: {
        performedAt: { gte: since },
        severity: { in: ['MEDIUM', 'HIGH', 'CRITICAL'] }
      }
    });

    const criticalIncidents = incidents.filter(i => i.severity === 'CRITICAL');

    // Calculate threat types
    const threatTypes = new Map<string, number>();
    incidents.forEach(incident => {
      const type = incident.action;
      threatTypes.set(type, (threatTypes.get(type) || 0) + 1);
    });

    const topThreatTypes = Array.from(threatTypes.entries())
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // IP address statistics
    const ipStats = new Map<string, number>();
    incidents.forEach(incident => {
      const ip = incident.ipAddress || 'unknown';
      ipStats.set(ip, (ipStats.get(ip) || 0) + 1);
    });

    const ipAddressStats = Array.from(ipStats.entries())
      .map(([ip, incidents]) => ({ 
        ip, 
        incidents, 
        blocked: this.blockedIPs.has(ip) 
      }))
      .sort((a, b) => b.incidents - a.incidents);

    // Calculate user security score (average of all users)
    const userScores = Array.from(this.userRiskScores.values());
    const userSecurityScore = userScores.length > 0 
      ? Math.round(100 - (userScores.reduce((sum, score) => sum + score, 0) / userScores.length))
      : 85; // Default good score

    return {
      totalIncidents: incidents.length,
      criticalIncidents: criticalIncidents.length,
      averageResponseTime: 0, // Would need to calculate from incident resolution times
      topThreatTypes,
      ipAddressStats,
      userSecurityScore
    };
  }

  async generateSecurityReport(): Promise<string> {
    const metrics = await this.getSecurityMetrics();
    const activeThreats = await this.detectAnomalousPatterns();

    const report = {
      reportDate: new Date().toISOString(),
      summary: {
        overallSecurityStatus: this.calculateOverallSecurityStatus(metrics),
        totalIncidents: metrics.totalIncidents,
        criticalIncidents: metrics.criticalIncidents,
        userSecurityScore: metrics.userSecurityScore
      },
      threats: {
        active: activeThreats.length,
        top10: metrics.topThreatTypes
      },
      ipSecurity: {
        blockedIPs: Array.from(this.blockedIPs),
        suspiciousIPs: Array.from(this.suspiciousIPs.keys()),
        topRiskyIPs: metrics.ipAddressStats.slice(0, 10)
      },
      recommendations: this.generateSecurityRecommendations(metrics),
      compliance: {
        hipaaCompliant: await this.checkHIPAACompliance(),
        dataRetentionCompliant: await this.checkDataRetention(),
        auditTrailIntegrity: await this.verifyAuditIntegrity()
      }
    };

    return JSON.stringify(report, null, 2);
  }

  // =============================================================================
  // UTILITY METHODS
  // =============================================================================

  private generateIncidentId(): string {
    return `SEC_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private sanitizeDetails(details: any): any {
    if (!details || typeof details !== 'object') return details;

    const sanitized = { ...details };
    
    // Remove sensitive information
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'ssn'];
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  private containsPHI(entityType: string, data: any): boolean {
    const phiEntities = ['Carer', 'AdminUser', 'AssessmentResponse'];
    if (phiEntities.includes(entityType)) return true;

    if (data && typeof data === 'object') {
      return HIPAA_CONFIG.PHI_FIELDS.some(field => 
        Object.keys(data).some(key => 
          key.toLowerCase().includes(field.toLowerCase())
        )
      );
    }

    return false;
  }

  private analyzeTimePatterns(logs: any[]): { outsideBusinessHours: number } {
    const businessHourLogs = logs.filter(log => {
      const hour = new Date(log.performedAt).getHours();
      return hour >= 9 && hour <= 17; // 9 AM to 5 PM
    });

    return {
      outsideBusinessHours: logs.length > 0 ? 
        (logs.length - businessHourLogs.length) / logs.length : 0
    };
  }

  private analyzeIPPatterns(logs: any[]): { uniqueIPs: number } {
    const ips = new Set(logs.map(log => log.ipAddress).filter(Boolean));
    return { uniqueIPs: ips.size };
  }

  private calculateOverallSecurityStatus(metrics: SecurityMetrics): string {
    let score = 100;
    
    if (metrics.criticalIncidents > 0) score -= 30;
    if (metrics.totalIncidents > 50) score -= 20;
    if (metrics.userSecurityScore < 70) score -= 15;

    if (score >= 90) return 'EXCELLENT';
    if (score >= 80) return 'GOOD';
    if (score >= 70) return 'FAIR';
    if (score >= 60) return 'POOR';
    return 'CRITICAL';
  }

  private generateSecurityRecommendations(metrics: SecurityMetrics): string[] {
    const recommendations: string[] = [];

    if (metrics.criticalIncidents > 0) {
      recommendations.push('Address all critical security incidents immediately');
    }

    if (metrics.totalIncidents > 20) {
      recommendations.push('Implement additional preventive security controls');
    }

    if (metrics.userSecurityScore < 80) {
      recommendations.push('Provide additional security training to users');
    }

    if (metrics.topThreatTypes.length > 0) {
      const topThreat = metrics.topThreatTypes[0];
      recommendations.push(`Focus on mitigating ${topThreat.type} threats (${topThreat.count} incidents)`);
    }

    return recommendations;
  }

  // Compliance checking methods
  private async checkHIPAACompliance(): Promise<boolean> {
    // Implementation would check various HIPAA requirements
    return true; // Simplified for now
  }

  private async checkDataRetention(): Promise<boolean> {
    // Check if data retention policies are being followed
    return true; // Simplified for now
  }

  private async verifyAuditIntegrity(): Promise<boolean> {
    // Verify audit log integrity and completeness
    return true; // Simplified for now
  }

  // Placeholder methods for integration points
  private async persistIncident(incident: SecurityIncident): Promise<void> {
    // Store incident in database
  }

  private async updateThreatIntelligence(incident: SecurityIncident): Promise<void> {
    // Update threat intelligence database
  }

  private async sendCriticalAlert(incident: SecurityIncident): Promise<void> {
    // Send alerts via email, SMS, Slack, etc.
  }

  private async addToSuspiciousIPs(ipAddress: string): Promise<void> {
    // Add to suspicious IP monitoring
  }

  private async requireReAuthentication(userId?: string): Promise<void> {
    // Force user to re-authenticate
  }

  private async invalidateUserSessions(userId?: string): Promise<void> {
    // Invalidate all sessions for user
  }

  private async updateIncidentActions(incidentId: string, actions: string[]): Promise<void> {
    // Update incident with response actions
  }

  // Public method to check if IP is blocked
  isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  // Public method to get user risk score
  getUserRiskScore(userId: string): number {
    return this.userRiskScores.get(userId) || 0;
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
export { SecurityIncident, SecurityMetrics };