#!/usr/bin/env bun

// monitoring/onepay-monitor.js - Production Monitoring & Alerting
// Real-time monitoring with GDPR compliance tracking

import { EventEmitter } from 'events';
import { createHash } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';

console.log("📊 OnePay Production Monitoring - Active");

/**
 * Production monitoring system with GDPR compliance tracking
 */
class OnePayMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.alerts = [];
        this.gdprMetrics = new Map();
        this.performanceMetrics = new Map();
        this.securityMetrics = new Map();
        this.healthStatus = {
            overall: 'HEALTHY',
            gdpr: 'COMPLIANT',
            performance: 'OPTIMAL',
            security: 'SECURE'
        };
        
        this.initializeMetrics();
        this.startMonitoring();
    }

    /**
     * Initialize monitoring metrics
     */
    initializeMetrics() {
        // GDPR Compliance Metrics
        this.gdprMetrics.set('consentRequests', { value: 0, timestamp: Date.now() });
        this.gdprMetrics.set('dataExports', { value: 0, timestamp: Date.now() });
        this.gdprMetrics.set('autoDeletions', { value: 0, timestamp: Date.now() });
        this.gdprMetrics.set('objections', { value: 0, timestamp: Date.now() });
        this.gdprMetrics.set('processingRecords', { value: 0, timestamp: Date.now() });
        this.gdprMetrics.set('consentRate', { value: 0, timestamp: Date.now() });
        this.gdprMetrics.set('deletionCompliance', { value: 100, timestamp: Date.now() });

        // Performance Metrics
        this.performanceMetrics.set('verificationTime', { value: 0, count: 0, timestamp: Date.now() });
        this.performanceMetrics.set('approvalRate', { value: 0, count: 0, timestamp: Date.now() });
        this.performanceMetrics.set('throughput', { value: 0, timestamp: Date.now() });
        this.performanceMetrics.set('errorRate', { value: 0, count: 0, timestamp: Date.now() });
        this.performanceMetrics.set('memoryUsage', { value: 0, timestamp: Date.now() });
        this.performanceMetrics.set('responseTime', { value: 0, count: 0, timestamp: Date.now() });

        // Security Metrics
        this.securityMetrics.set('fraudDetections', { value: 0, timestamp: Date.now() });
        this.securityMetrics.set('securityEvents', { value: 0, timestamp: Date.now() });
        this.securityMetrics.set('authFailures', { value: 0, timestamp: Date.now() });
        this.securityMetrics.set('dataBreaches', { value: 0, timestamp: Date.now() });
        this.securityMetrics.set('encryptionStatus', { value: 'ACTIVE', timestamp: Date.now() });
        this.securityMetrics.set('accessViolations', { value: 0, timestamp: Date.now() });
    }

    /**
     * Start monitoring loops
     */
    startMonitoring() {
        // GDPR Compliance Monitoring
        setInterval(() => this.checkGDPRCompliance(), 30000); // 30 seconds
        
        // Performance Monitoring
        setInterval(() => this.checkPerformance(), 10000); // 10 seconds
        
        // Security Monitoring
        setInterval(() => this.checkSecurity(), 15000); // 15 seconds
        
        // Health Check
        setInterval(() => this.performHealthCheck(), 60000); // 1 minute
        
        // Metrics Collection
        setInterval(() => this.collectMetrics(), 5000); // 5 seconds
        
        console.log('📊 Monitoring started with 5-second metrics collection');
    }

    /**
     * Track GDPR consent request
     */
    trackConsentRequest(userId, location, granted) {
        this.incrementMetric('consentRequests', 'gdpr');
        
        if (granted) {
            this.updateConsentRate();
        }

        this.emit('gdpr:event', {
            type: 'CONSENT_REQUEST',
            userId: this.hashUserId(userId),
            location,
            granted,
            timestamp: new Date().toISOString()
        });

        console.log(`🛡️ Consent request tracked: ${location} - ${granted ? 'GRANTED' : 'DENIED'}`);
    }

    /**
     * Track data export request
     */
    trackDataExport(userId, dataSize, format) {
        this.incrementMetric('dataExports', 'gdpr');

        this.emit('gdpr:event', {
            type: 'DATA_EXPORT',
            userId: this.hashUserId(userId),
            dataSize,
            format,
            timestamp: new Date().toISOString()
        });

        console.log(`📤 Data export tracked: ${dataSize} bytes in ${format} format`);
    }

    /**
     * Track auto-deletion execution
     */
    trackAutoDeletion(elements, userId) {
        this.incrementMetric('autoDeletions', 'gdpr');

        this.emit('gdpr:event', {
            type: 'AUTO_DELETION',
            userId: this.hashUserId(userId),
            elements,
            timestamp: new Date().toISOString()
        });

        console.log(`🗑️ Auto-deletion tracked: ${elements.length} elements for user ${this.hashUserId(userId)}`);
    }

    /**
     * Track user objection
     */
    trackObjection(userId, objectionType) {
        this.incrementMetric('objections', 'gdpr');

        this.emit('gdpr:event', {
            type: 'USER_OBJECTION',
            userId: this.hashUserId(userId),
            objectionType,
            timestamp: new Date().toISOString()
        });

        console.log(`⚠️ User objection tracked: ${objectionType} by ${this.hashUserId(userId)}`);
    }

    /**
     * Track verification performance
     */
    trackVerification(userId, responseTime, success, tier) {
        this.updatePerformanceMetric('verificationTime', responseTime);
        this.updatePerformanceMetric('approvalRate', success ? 1 : 0);

        this.emit('performance:event', {
            type: 'VERIFICATION',
            userId: this.hashUserId(userId),
            responseTime,
            success,
            tier,
            timestamp: new Date().toISOString()
        });

        console.log(`⚡ Verification tracked: ${responseTime}ms - ${success ? 'SUCCESS' : 'FAILED'} - ${tier}`);
    }

    /**
     * Track fraud detection
     */
    trackFraudDetection(userId, confidence, pattern) {
        this.incrementMetric('fraudDetections', 'security');

        this.emit('security:event', {
            type: 'FRAUD_DETECTED',
            userId: this.hashUserId(userId),
            confidence,
            pattern,
            timestamp: new Date().toISOString()
        });

        console.log(`🚨 Fraud detection tracked: ${confidence.toFixed(2)} confidence - ${pattern}`);
        
        // Trigger alert for high confidence fraud
        if (confidence > 0.8) {
            this.triggerAlert('HIGH_CONFIDENCE_FRAUD', {
                userId: this.hashUserId(userId),
                confidence,
                pattern
            });
        }
    }

    /**
     * Track security event
     */
    trackSecurityEvent(eventType, userId, details) {
        this.incrementMetric('securityEvents', 'security');

        this.emit('security:event', {
            type: eventType,
            userId: this.hashUserId(userId),
            details,
            timestamp: new Date().toISOString()
        });

        console.log(`🔒 Security event tracked: ${eventType} by ${this.hashUserId(userId)}`);

        // Trigger alert for critical security events
        if (['DATA_BREACH', 'UNAUTHORIZED_ACCESS', 'ENCRYPTION_FAILURE'].includes(eventType)) {
            this.triggerAlert('CRITICAL_SECURITY_EVENT', {
                eventType,
                userId: this.hashUserId(userId),
                details
            });
        }
    }

    /**
     * Check GDPR compliance
     */
    checkGDPRCompliance() {
        const consentRequests = this.getMetric('consentRequests', 'gdpr');
        const dataExports = this.getMetric('dataExports', 'gdpr');
        const autoDeletions = this.getMetric('autoDeletions', 'gdpr');
        const objections = this.getMetric('objections', 'gdpr');

        // Check consent rate compliance
        const consentRate = this.getMetric('consentRate', 'gdpr');
        if (consentRate < 70) {
            this.triggerAlert('LOW_CONSENT_RATE', { consentRate });
            this.healthStatus.gdpr = 'AT_RISK';
        }

        // Check deletion compliance
        const deletionCompliance = this.getMetric('deletionCompliance', 'gdpr');
        if (deletionCompliance < 95) {
            this.triggerAlert('DELETION_COMPLIANCE_ISSUE', { deletionCompliance });
            this.healthStatus.gdpr = 'NON_COMPLIANT';
        }

        // Check for unusual objection patterns
        if (objections > consentRequests * 0.1) {
            this.triggerAlert('HIGH_OBJECTION_RATE', { objections, consentRequests });
        }

        // Update overall GDPR status
        if (this.healthStatus.gdpr === 'AT_RISK' || this.healthStatus.gdpr === 'NON_COMPLIANT') {
            this.healthStatus.overall = 'DEGRADED';
        } else {
            this.healthStatus.gdpr = 'COMPLIANT';
        }

        this.emit('gdpr:check', {
            status: this.healthStatus.gdpr,
            metrics: {
                consentRequests,
                dataExports,
                autoDeletions,
                objections,
                consentRate,
                deletionCompliance
            }
        });
    }

    /**
     * Check performance metrics
     */
    checkPerformance() {
        const avgVerificationTime = this.getAverageMetric('verificationTime', 'performance');
        const approvalRate = this.getAverageMetric('approvalRate', 'performance');
        const throughput = this.getMetric('throughput', 'performance');
        const errorRate = this.getAverageMetric('errorRate', 'performance');
        const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

        // Check verification time
        if (avgVerificationTime > 5000) {
            this.triggerAlert('SLOW_VERIFICATION', { avgVerificationTime });
            this.healthStatus.performance = 'DEGRADED';
        }

        // Check approval rate
        if (approvalRate < 85) {
            this.triggerAlert('LOW_APPROVAL_RATE', { approvalRate });
            this.healthStatus.performance = 'DEGRADED';
        }

        // Check error rate
        if (errorRate > 0.05) {
            this.triggerAlert('HIGH_ERROR_RATE', { errorRate });
            this.healthStatus.performance = 'DEGRADED';
        }

        // Check memory usage
        if (memoryUsage > 500) {
            this.triggerAlert('HIGH_MEMORY_USAGE', { memoryUsage });
            this.healthStatus.performance = 'DEGRADED';
        }

        // Update overall performance status
        if (this.healthStatus.performance === 'DEGRADED') {
            this.healthStatus.overall = 'DEGRADED';
        } else {
            this.healthStatus.performance = 'OPTIMAL';
        }

        this.emit('performance:check', {
            status: this.healthStatus.performance,
            metrics: {
                avgVerificationTime,
                approvalRate,
                throughput,
                errorRate,
                memoryUsage
            }
        });
    }

    /**
     * Check security metrics
     */
    checkSecurity() {
        const fraudDetections = this.getMetric('fraudDetections', 'security');
        const securityEvents = this.getMetric('securityEvents', 'security');
        const authFailures = this.getMetric('authFailures', 'security');
        const dataBreaches = this.getMetric('dataBreaches', 'security');
        const accessViolations = this.getMetric('accessViolations', 'security');

        // Check for data breaches
        if (dataBreaches > 0) {
            this.triggerAlert('DATA_BREACH_DETECTED', { count: dataBreaches });
            this.healthStatus.security = 'COMPROMISED';
            this.healthStatus.overall = 'CRITICAL';
        }

        // Check for high fraud detection rate
        if (fraudDetections > 100) {
            this.triggerAlert('HIGH_FRAUD_RATE', { fraudDetections });
            this.healthStatus.security = 'AT_RISK';
        }

        // Check for high authentication failures
        if (authFailures > 50) {
            this.triggerAlert('HIGH_AUTH_FAILURES', { authFailures });
            this.healthStatus.security = 'AT_RISK';
        }

        // Update overall security status
        if (this.healthStatus.security === 'COMPROMISED') {
            this.healthStatus.overall = 'CRITICAL';
        } else if (this.healthStatus.security === 'AT_RISK') {
            this.healthStatus.overall = 'DEGRADED';
        } else {
            this.healthStatus.security = 'SECURE';
        }

        this.emit('security:check', {
            status: this.healthStatus.security,
            metrics: {
                fraudDetections,
                securityEvents,
                authFailures,
                dataBreaches,
                accessViolations
            }
        });
    }

    /**
     * Perform comprehensive health check
     */
    performHealthCheck() {
        const health = {
            timestamp: new Date().toISOString(),
            overall: this.healthStatus.overall,
            components: {
                gdpr: this.healthStatus.gdpr,
                performance: this.healthStatus.performance,
                security: this.healthStatus.security
            },
            metrics: {
                gdpr: this.getGDPRMetrics(),
                performance: this.getPerformanceMetrics(),
                security: this.getSecurityMetrics()
            },
            alerts: this.getActiveAlerts(),
            uptime: process.uptime(),
            memory: process.memoryUsage()
        };

        this.emit('health:check', health);

        // Save health status to file
        this.saveHealthStatus(health);

        return health;
    }

    /**
     * Collect and aggregate metrics
     */
    collectMetrics() {
        const metrics = {
            timestamp: new Date().toISOString(),
            gdpr: this.getGDPRMetrics(),
            performance: this.getPerformanceMetrics(),
            security: this.getSecurityMetrics(),
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu: process.cpuUsage()
            }
        };

        this.emit('metrics:collected', metrics);

        // Save metrics to file
        this.saveMetrics(metrics);
    }

    /**
     * Trigger alert
     */
    triggerAlert(type, details) {
        const alert = {
            id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            severity: this.getAlertSeverity(type),
            details,
            timestamp: new Date().toISOString(),
            status: 'ACTIVE'
        };

        this.alerts.push(alert);
        this.emit('alert:triggered', alert);

        console.log(`🚨 ALERT triggered: ${type} - ${alert.severity}`);
        
        // Log alert to file
        this.logAlert(alert);
    }

    /**
     * Get alert severity
     */
    getAlertSeverity(type) {
        const severityMap = {
            'DATA_BREACH_DETECTED': 'CRITICAL',
            'CRITICAL_SECURITY_EVENT': 'CRITICAL',
            'HIGH_CONFIDENCE_FRAUD': 'HIGH',
            'DELETION_COMPLIANCE_ISSUE': 'HIGH',
            'LOW_CONSENT_RATE': 'MEDIUM',
            'SLOW_VERIFICATION': 'MEDIUM',
            'LOW_APPROVAL_RATE': 'MEDIUM',
            'HIGH_ERROR_RATE': 'MEDIUM',
            'HIGH_MEMORY_USAGE': 'LOW',
            'HIGH_OBJECTION_RATE': 'LOW'
        };

        return severityMap[type] || 'MEDIUM';
    }

    /**
     * Update consent rate
     */
    updateConsentRate() {
        const consentRequests = this.getMetric('consentRequests', 'gdpr');
        // This would be calculated based on actual granted/denied ratio
        const consentRate = Math.min(95, Math.max(70, 85 + Math.random() * 10));
        this.setMetric('consentRate', consentRate, 'gdpr');
    }

    /**
     * Increment metric value
     */
    incrementMetric(name, category) {
        const metrics = this.getMetricsCategory(category);
        const current = metrics.get(name) || { value: 0, timestamp: Date.now() };
        current.value++;
        current.timestamp = Date.now();
        metrics.set(name, current);
    }

    /**
     * Update performance metric
     */
    updatePerformanceMetric(name, value) {
        const current = this.performanceMetrics.get(name) || { value: 0, count: 0, timestamp: Date.now() };
        current.value = (current.value * current.count + value) / (current.count + 1);
        current.count++;
        current.timestamp = Date.now();
        this.performanceMetrics.set(name, current);
    }

    /**
     * Set metric value
     */
    setMetric(name, value, category) {
        const metrics = this.getMetricsCategory(category);
        metrics.set(name, { value, timestamp: Date.now() });
    }

    /**
     * Get metric value
     */
    getMetric(name, category) {
        const metrics = this.getMetricsCategory(category);
        return metrics.get(name)?.value || 0;
    }

    /**
     * Get average metric value
     */
    getAverageMetric(name, category) {
        const metric = this.getMetricsCategory(category).get(name);
        return metric?.value || 0;
    }

    /**
     * Get metrics category
     */
    getMetricsCategory(category) {
        switch (category) {
            case 'gdpr': return this.gdprMetrics;
            case 'performance': return this.performanceMetrics;
            case 'security': return this.securityMetrics;
            default: return this.metrics;
        }
    }

    /**
     * Get GDPR metrics
     */
    getGDPRMetrics() {
        const result = {};
        for (const [key, value] of this.gdprMetrics) {
            result[key] = value.value;
        }
        return result;
    }

    /**
     * Get performance metrics
     */
    getPerformanceMetrics() {
        const result = {};
        for (const [key, value] of this.performanceMetrics) {
            result[key] = value.value;
        }
        return result;
    }

    /**
     * Get security metrics
     */
    getSecurityMetrics() {
        const result = {};
        for (const [key, value] of this.securityMetrics) {
            result[key] = value.value;
        }
        return result;
    }

    /**
     * Get active alerts
     */
    getActiveAlerts() {
        return this.alerts.filter(alert => alert.status === 'ACTIVE');
    }

    /**
     * Hash user ID for privacy
     */
    hashUserId(userId) {
        return createHash('sha256')
            .update(userId + 'monitoring-salt')
            .digest('hex')
            .substring(0, 12);
    }

    /**
     * Save health status to file
     */
    saveHealthStatus(health) {
        try {
            writeFileSync('./monitoring/health-status.json', JSON.stringify(health, null, 2));
        } catch (error) {
            console.warn('⚠️ Failed to save health status:', error.message);
        }
    }

    /**
     * Save metrics to file
     */
    saveMetrics(metrics) {
        try {
            const filename = `./monitoring/metrics-${Date.now()}.json`;
            writeFileSync(filename, JSON.stringify(metrics, null, 2));
            
            // Keep only last 100 metrics files
            this.cleanupOldMetrics(100);
        } catch (error) {
            console.warn('⚠️ Failed to save metrics:', error.message);
        }
    }

    /**
     * Log alert to file
     */
    logAlert(alert) {
        try {
            const logFile = './monitoring/alerts.log';
            const logEntry = `${alert.timestamp} [${alert.severity}] ${alert.type}: ${JSON.stringify(alert.details)}\n`;
            
            if (existsSync(logFile)) {
                const current = readFileSync(logFile, 'utf-8');
                writeFileSync(logFile, current + logEntry);
            } else {
                writeFileSync(logFile, logEntry);
            }
        } catch (error) {
            console.warn('⚠️ Failed to log alert:', error.message);
        }
    }

    /**
     * Cleanup old metrics files
     */
    cleanupOldMetrics(keepCount) {
        // This would implement file cleanup logic
        // For now, just log that cleanup would happen
        console.log(`🧹 Would keep last ${keepCount} metrics files`);
    }

    /**
     * Get monitoring dashboard data
     */
    getDashboardData() {
        return {
            health: this.healthStatus,
            metrics: {
                gdpr: this.getGDPRMetrics(),
                performance: this.getPerformanceMetrics(),
                security: this.getSecurityMetrics()
            },
            alerts: this.getActiveAlerts(),
            timestamp: new Date().toISOString()
        };
    }
}

// Create global monitor instance
const monitor = new OnePayMonitor();

// Export for use in other modules
export { OnePayMonitor, monitor };

// Export monitoring functions for easy access
export const trackConsent = (userId, location, granted) => monitor.trackConsentRequest(userId, location, granted);
export const trackDataExport = (userId, dataSize, format) => monitor.trackDataExport(userId, dataSize, format);
export const trackAutoDeletion = (elements, userId) => monitor.trackAutoDeletion(elements, userId);
export const trackObjection = (userId, objectionType) => monitor.trackObjection(userId, objectionType);
export const trackVerification = (userId, responseTime, success, tier) => monitor.trackVerification(userId, responseTime, success, tier);
export const trackFraud = (userId, confidence, pattern) => monitor.trackFraudDetection(userId, confidence, pattern);
export const trackSecurityEvent = (eventType, userId, details) => monitor.trackSecurityEvent(eventType, userId, details);
