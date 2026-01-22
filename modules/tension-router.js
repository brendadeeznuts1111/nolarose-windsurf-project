#!/usr/bin/env bun

// modules/tension-router.js - Isolated Tension Routing Module
// Adaptive routing and tier decisions with conflict detection

console.log("🛣️ Tension Router Module - Loaded");

/**
 * Tension Router for adaptive routing and tier decisions
 * 
 * Handles routing logic, tier decisions, and conflict detection:
 * - Adaptive strategy application
 * - Tier routing and decision making
 * - Conflict detection and warnings
 * - Manual review queuing
 */
export class TensionRouter {
    constructor(config = {}) {
        this.config = {
            // Risk thresholds for different tiers
            tiers: {
                INSTANT: { maxRiskScore: 20, minConfidence: 90, requiresManualReview: false },
                FAST: { maxRiskScore: 40, minConfidence: 80, requiresManualReview: false },
                STANDARD: { maxRiskScore: 60, minConfidence: 70, requiresManualReview: false },
                REVIEW: { maxRiskScore: 80, minConfidence: 60, requiresManualReview: true },
                REJECT: { maxRiskScore: 100, minConfidence: 0, requiresManualReview: false }
            },
            // Routing configuration
            routing: {
                enableAdaptiveRouting: config.enableAdaptiveRouting !== false,
                conflictDetection: config.conflictDetection !== false,
                manualReviewThreshold: config.manualReviewThreshold || 70,
                queueHighRisk: config.queueHighRisk !== false,
                escalationThreshold: config.escalationThreshold || 85
            },
            // Performance thresholds
            performance: {
                maxResponseTime: config.maxResponseTime || 5000,
                maxQueueSize: config.maxQueueSize || 1000,
                retryAttempts: config.retryAttempts || 3
            },
            ...config
        };
        
        this.routingHistory = new Map();
        this.manualReviewQueue = [];
        this.conflictLog = [];
        this.metrics = {
            totalRoutings: 0,
            tierDecisions: { INSTANT: 0, FAST: 0, STANDARD: 0, REVIEW: 0, REJECT: 0 },
            conflictsDetected: 0,
            manualReviewsQueued: 0,
            averageRoutingTime: 0,
            adaptiveDecisions: 0
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize tension router
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Validate configuration
            this.validateConfig();
            
            // Clean old routing history
            this.cleanupHistory();
            
            this.initialized = true;
            console.log('✅ Tension Router initialized');
            
        } catch (error) {
            console.error('❌ Tension Router initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Apply adaptive strategy based on identity result
     */
    applyAdaptiveStrategy(identityResult) {
        const startTime = performance.now();
        
        try {
            console.log(`🎯 Applying adaptive strategy for user: ${this.maskPII(identityResult.userId)}`);
            
            const strategy = {
                userId: identityResult.userId,
                verificationId: identityResult.verificationId,
                tier: 'STANDARD',
                requiresCashAppVerification: false,
                requiresPlaidVerification: false,
                requiresManualReview: false,
                confidence: identityResult.confidence || 0,
                riskScore: this.calculateRiskScore(identityResult),
                factors: {},
                timestamp: Date.now()
            };
            
            // Analyze identity factors
            strategy.factors = this.analyzeIdentityFactors(identityResult);
            
            // Determine verification requirements
            const verificationNeeds = this.determineVerificationNeeds(strategy);
            strategy.requiresCashAppVerification = verificationNeeds.cashApp;
            strategy.requiresPlaidVerification = verificationNeeds.plaid;
            strategy.requiresManualReview = verificationNeeds.manualReview;
            
            // Apply adaptive routing if enabled
            if (this.config.routing.enableAdaptiveRouting) {
                this.applyAdaptiveRouting(strategy, identityResult);
                this.metrics.adaptiveDecisions++;
            }
            
            // Determine initial tier
            strategy.tier = this.determineInitialTier(strategy);
            
            const routingTime = performance.now() - startTime;
            strategy.routingTime = routingTime.toFixed(2);
            
            console.log(`Adaptive strategy applied: ${strategy.tier} tier, confidence: ${strategy.confidence}%`);
            
            return strategy;
            
        } catch (error) {
            console.error('❌ Adaptive strategy application failed:', error);
            return {
                tier: 'REJECT',
                requiresCashAppVerification: false,
                requiresPlaidVerification: false,
                requiresManualReview: true,
                error: error.message
            };
        }
    }
    
    /**
     * Route verification result to appropriate tier
     */
    async routeToTier(finalResult, approvalDecision) {
        const startTime = performance.now();
        this.metrics.totalRoutings++;
        
        try {
            console.log(`🛣️ Routing verification to tier for user: ${this.maskPII(finalResult.userId)}`);
            
            const routing = {
                userId: finalResult.userId,
                verificationId: finalResult.verificationId,
                finalTier: 'STANDARD',
                initialTier: approvalDecision.tier,
                requiresManualReview: false,
                automated: true,
                conflicts: [],
                warnings: [],
                routingTime: 0,
                timestamp: Date.now()
            };
            
            // Combine risk scores and confidence
            const combinedRisk = this.calculateCombinedRisk(finalResult, approvalDecision);
            const combinedConfidence = this.calculateCombinedConfidence(finalResult, approvalDecision);
            
            // Detect conflicts
            if (this.config.routing.conflictDetection) {
                routing.conflicts = this.detectConflicts(finalResult, approvalDecision);
                if (routing.conflicts.length > 0) {
                    this.metrics.conflictsDetected++;
                    this.logConflict(routing);
                }
            }
            
            // Determine final tier
            routing.finalTier = this.determineFinalTier(
                combinedRisk,
                combinedConfidence,
                routing.conflicts,
                finalResult
            );
            
            // Check for manual review requirements
            routing.requiresManualReview = this.requiresManualReview(
                routing.finalTier,
                combinedRisk,
                routing.conflicts
            );
            
            // Queue for manual review if needed
            if (routing.requiresManualReview) {
                this.queueManualReview(routing);
                routing.automated = false;
            }
            
            // Generate warnings
            routing.warnings = this.generateWarnings(routing, combinedRisk);
            
            // Store routing history
            this.storeRoutingHistory(routing);
            
            const routingTime = performance.now() - startTime;
            routing.routingTime = routingTime.toFixed(2);
            this.updateMetrics(routingTime, routing.finalTier);
            
            console.log(`Routing completed: ${routing.finalTier} tier, automated: ${routing.automated}`);
            
            return routing;
            
        } catch (error) {
            console.error('❌ Routing failed:', error);
            return {
                finalTier: 'REJECT',
                requiresManualReview: true,
                automated: false,
                error: error.message
            };
        }
    }
    
    /**
     * Create rejection response
     */
    createRejectionResponse(result, reason) {
        return {
            success: false,
            userId: this.maskPII(result.userId || 'unknown'),
            verificationId: result.verificationId || 'unknown',
            reason,
            tier: 'REJECT',
            requiresManualReview: false,
            timestamp: new Date().toISOString(),
            details: {
                confidence: result.confidence || 0,
                riskScore: result.riskScore || 100,
                issues: result.issues || [reason]
            }
        };
    }
    
    /**
     * Analyze identity factors for risk assessment
     */
    analyzeIdentityFactors(identityResult) {
        const factors = {
            documentVerification: identityResult.documents?.verified || false,
            emailVerification: identityResult.email?.verified || false,
            phoneVerification: identityResult.phone?.verified || false,
            ageVerification: identityResult.age?.verified || false,
            addressVerification: identityResult.address?.verified || false,
            riskFactors: []
        };
        
        // Identify risk factors
        if (!factors.documentVerification) {
            factors.riskFactors.push('unverified_documents');
        }
        
        if (!factors.emailVerification) {
            factors.riskFactors.push('unverified_email');
        }
        
        if (!factors.phoneVerification) {
            factors.riskFactors.push('unverified_phone');
        }
        
        if (identityResult.age?.value < 18) {
            factors.riskFactors.push('underage');
        }
        
        if (identityResult.riskScore > 50) {
            factors.riskFactors.push('high_risk_profile');
        }
        
        return factors;
    }
    
    /**
     * Determine verification needs based on strategy
     */
    determineVerificationNeeds(strategy) {
        const needs = {
            cashApp: false,
            plaid: false,
            manualReview: false
        };
        
        // High risk requires additional verification
        if (strategy.riskScore > 40) {
            needs.cashApp = true;
        }
        
        // Medium risk requires bank verification
        if (strategy.riskScore > 20) {
            needs.plaid = true;
        }
        
        // Very high risk requires manual review
        if (strategy.riskScore > 70) {
            needs.manualReview = true;
        }
        
        // Low confidence requires additional verification
        if (strategy.confidence < 70) {
            needs.cashApp = true;
            needs.plaid = true;
        }
        
        return needs;
    }
    
    /**
     * Apply adaptive routing logic
     */
    applyAdaptiveRouting(strategy, identityResult) {
        // Check user history
        const userHistory = this.routingHistory.get(identityResult.userId);
        
        if (userHistory && userHistory.length > 0) {
            const lastRouting = userHistory[userHistory.length - 1];
            
            // If user was previously approved, reduce requirements
            if (lastRouting.finalTier !== 'REJECT' && lastRouting.finalTier !== 'REVIEW') {
                strategy.riskScore = Math.max(0, strategy.riskScore - 10);
                strategy.confidence = Math.min(100, strategy.confidence + 5);
            }
            
            // If user was previously rejected, increase requirements
            if (lastRouting.finalTier === 'REJECT') {
                strategy.riskScore = Math.min(100, strategy.riskScore + 15);
                strategy.requiresManualReview = true;
            }
        }
        
        // Apply time-based adjustments
        const hour = new Date().getHours();
        if (hour >= 9 && hour <= 17) {
            // Business hours - slightly more lenient
            strategy.riskScore = Math.max(0, strategy.riskScore - 5);
        } else {
            // Non-business hours - more strict
            strategy.riskScore = Math.min(100, strategy.riskScore + 5);
        }
    }
    
    /**
     * Determine initial tier based on strategy
     */
    determineInitialTier(strategy) {
        const { tiers } = this.config;
        
        for (const [tierName, tierConfig] of Object.entries(tiers)) {
            if (strategy.riskScore <= tierConfig.maxRiskScore &&
                strategy.confidence >= tierConfig.minConfidence) {
                return tierName;
            }
        }
        
        return 'REJECT';
    }
    
    /**
     * Calculate combined risk score
     */
    calculateCombinedRisk(finalResult, approvalDecision) {
        let combinedRisk = 0;
        
        // Weight individual risk scores
        if (finalResult.riskScore) {
            combinedRisk += finalResult.riskScore * 0.4;
        }
        
        if (approvalDecision.riskScore) {
            combinedRisk += approvalDecision.riskScore * 0.4;
        }
        
        // Add cross-validation risk
        if (finalResult.validation?.riskScore) {
            combinedRisk += finalResult.validation.riskScore * 0.2;
        }
        
        return Math.min(combinedRisk, 100);
    }
    
    /**
     * Calculate combined confidence score
     */
    calculateCombinedConfidence(finalResult, approvalDecision) {
        let combinedConfidence = 0;
        
        // Weight individual confidence scores
        if (finalResult.confidence) {
            combinedConfidence += finalResult.confidence * 0.4;
        }
        
        if (approvalDecision.confidence) {
            combinedConfidence += approvalDecision.confidence * 0.4;
        }
        
        // Add cross-validation confidence
        if (finalResult.validation?.confidence) {
            combinedConfidence += finalResult.validation.confidence * 0.2;
        }
        
        return Math.min(combinedConfidence, 100);
    }
    
    /**
     * Detect conflicts between verification sources
     */
    detectConflicts(finalResult, approvalDecision) {
        const conflicts = [];
        
        // Check for inconsistent information
        if (finalResult.validation?.crossValidation) {
            const { crossValidation } = finalResult.validation;
            
            if (crossValidation.overallConsistency < 0.5) {
                conflicts.push('low_consistency');
            }
            
            if (crossValidation.identityCashApp < 0.6 && finalResult.sources?.cashApp) {
                conflicts.push('identity_cashapp_mismatch');
            }
            
            if (crossValidation.identityPlaid < 0.6 && finalResult.sources?.plaid) {
                conflicts.push('identity_plaid_mismatch');
            }
        }
        
        // Check for conflicting risk assessments
        if (finalResult.riskScore && approvalDecision.riskScore) {
            const riskDiff = Math.abs(finalResult.riskScore - approvalDecision.riskScore);
            if (riskDiff > 30) {
                conflicts.push('risk_assessment_conflict');
            }
        }
        
        // Check for conflicting confidence scores
        if (finalResult.confidence && approvalDecision.confidence) {
            const confidenceDiff = Math.abs(finalResult.confidence - approvalDecision.confidence);
            if (confidenceDiff > 25) {
                conflicts.push('confidence_conflict');
            }
        }
        
        return conflicts;
    }
    
    /**
     * Determine final tier considering all factors
     */
    determineFinalTier(combinedRisk, combinedConfidence, conflicts, finalResult) {
        const { tiers } = this.config;
        
        // Adjust risk based on conflicts
        const adjustedRisk = combinedRisk + (conflicts.length * 10);
        
        // Adjust confidence based on conflicts
        const adjustedConfidence = Math.max(0, combinedConfidence - (conflicts.length * 15));
        
        for (const [tierName, tierConfig] of Object.entries(tiers)) {
            if (adjustedRisk <= tierConfig.maxRiskScore &&
                adjustedConfidence >= tierConfig.minConfidence) {
                return tierName;
            }
        }
        
        return 'REJECT';
    }
    
    /**
     * Check if manual review is required
     */
    requiresManualReview(tier, riskScore, conflicts) {
        const { routing } = this.config;
        
        // Check tier requirements
        const tierConfig = this.config.tiers[tier];
        if (tierConfig?.requiresManualReview) {
            return true;
        }
        
        // Check risk threshold
        if (riskScore > routing.manualReviewThreshold) {
            return true;
        }
        
        // Check conflicts
        if (conflicts.length > 0) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Generate routing warnings
     */
    generateWarnings(routing, riskScore) {
        const warnings = [];
        
        if (riskScore > 60) {
            warnings.push('high_risk_detected');
        }
        
        if (routing.conflicts.length > 0) {
            warnings.push('verification_conflicts');
        }
        
        if (routing.finalTier === 'REVIEW') {
            warnings.push('manual_review_required');
        }
        
        if (routing.finalTier === 'REJECT') {
            warnings.push('verification_rejected');
        }
        
        return warnings;
    }
    
    /**
     * Queue manual review
     */
    queueManualReview(routing) {
        const reviewItem = {
            id: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId: routing.userId,
            verificationId: routing.verificationId,
            tier: routing.finalTier,
            riskScore: routing.riskScore,
            conflicts: routing.conflicts,
            warnings: routing.warnings,
            timestamp: Date.now(),
            status: 'queued'
        };
        
        this.manualReviewQueue.push(reviewItem);
        this.metrics.manualReviewsQueued++;
        
        console.log(`📋 Queued manual review for user: ${this.maskPII(routing.userId)}`);
        
        // Limit queue size
        if (this.manualReviewQueue.length > this.config.performance.maxQueueSize) {
            this.manualReviewQueue.shift();
        }
    }
    
    /**
     * Store routing history
     */
    storeRoutingHistory(routing) {
        if (!this.routingHistory.has(routing.userId)) {
            this.routingHistory.set(routing.userId, []);
        }
        
        const userHistory = this.routingHistory.get(routing.userId);
        userHistory.push(routing);
        
        // Keep only last 10 routings per user
        if (userHistory.length > 10) {
            userHistory.shift();
        }
    }
    
    /**
     * Log conflict for analysis
     */
    logConflict(routing) {
        const conflict = {
            timestamp: Date.now(),
            userId: routing.userId,
            conflicts: routing.conflicts,
            riskScore: routing.riskScore,
            tier: routing.finalTier
        };
        
        this.conflictLog.push(conflict);
        
        // Keep only last 1000 conflicts
        if (this.conflictLog.length > 1000) {
            this.conflictLog.shift();
        }
    }
    
    /**
     * Calculate risk score for identity result
     */
    calculateRiskScore(identityResult) {
        let riskScore = 0;
        
        // Document verification
        if (!identityResult.documents?.verified) {
            riskScore += 20;
        }
        
        // Email verification
        if (!identityResult.email?.verified) {
            riskScore += 15;
        }
        
        // Phone verification
        if (!identityResult.phone?.verified) {
            riskScore += 15;
        }
        
        // Age verification
        if (!identityResult.age?.verified || identityResult.age?.value < 18) {
            riskScore += 25;
        }
        
        // Address verification
        if (!identityResult.address?.verified) {
            riskScore += 10;
        }
        
        // Existing risk score
        if (identityResult.riskScore) {
            riskScore += identityResult.riskScore * 0.3;
        }
        
        return Math.min(riskScore, 100);
    }
    
    /**
     * Clean old routing history
     */
    cleanupHistory() {
        const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days
        
        for (const [userId, history] of this.routingHistory.entries()) {
            const recentHistory = history.filter(routing => routing.timestamp > cutoffTime);
            if (recentHistory.length === 0) {
                this.routingHistory.delete(userId);
            } else {
                this.routingHistory.set(userId, recentHistory);
            }
        }
    }
    
    /**
     * Update metrics
     */
    updateMetrics(routingTime, tier) {
        this.metrics.tierDecisions[tier]++;
        
        const totalRoutings = this.metrics.totalRoutings;
        const currentAvg = this.metrics.averageRoutingTime;
        this.metrics.averageRoutingTime = 
            (currentAvg * (totalRoutings - 1) + routingTime) / totalRoutings;
    }
    
    /**
     * Get module metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRoutings > 0 ? 
                ((this.metrics.tierDecisions.INSTANT + this.metrics.tierDecisions.FAST + this.metrics.tierDecisions.STANDARD) / this.metrics.totalRoutings) * 100 : 0,
            manualReviewQueueSize: this.manualReviewQueue.length,
            conflictRate: this.metrics.totalRoutings > 0 ? 
                (this.metrics.conflictsDetected / this.metrics.totalRoutings) * 100 : 0
        };
    }
    
    /**
     * Get manual review queue
     */
    getManualReviewQueue() {
        return this.manualReviewQueue.map(item => ({
            ...item,
            userId: this.maskPII(item.userId)
        }));
    }
    
    /**
     * Validate configuration
     */
    validateConfig() {
        // Validate tier configurations
        for (const [tierName, tierConfig] of Object.entries(this.config.tiers)) {
            if (typeof tierConfig.maxRiskScore !== 'number' || tierConfig.maxRiskScore < 0 || tierConfig.maxRiskScore > 100) {
                throw new Error(`Invalid maxRiskScore for tier ${tierName}`);
            }
            if (typeof tierConfig.minConfidence !== 'number' || tierConfig.minConfidence < 0 || tierConfig.minConfidence > 100) {
                throw new Error(`Invalid minConfidence for tier ${tierName}`);
            }
        }
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Validate configuration
            this.validateConfig();
            
            // Clean old data
            this.cleanupHistory();
            
            return {
                status: 'healthy',
                initialized: this.initialized,
                metrics: this.getMetrics(),
                config: {
                    tiersConfigured: Object.keys(this.config.tiers).length,
                    adaptiveRouting: this.config.routing.enableAdaptiveRouting,
                    conflictDetection: this.config.routing.conflictDetection,
                    manualReviewThreshold: this.config.routing.manualReviewThreshold
                }
            };
            
        } catch (error) {
            return {
                status: 'unhealthy',
                error: error.message
            };
        }
    }
    
    /**
     * Check if module is healthy
     */
    isHealthy() {
        return this.initialized;
    }
    
    /**
     * Shutdown module
     */
    async shutdown() {
        console.log('🔄 Shutting down Tension Router...');
        
        this.routingHistory.clear();
        this.manualReviewQueue = [];
        this.conflictLog = [];
        this.initialized = false;
        
        console.log('✅ Tension Router shutdown complete');
    }
    
    /**
     * Mask PII for logging
     */
    maskPII(value) {
        if (!value) return 'undefined';
        const str = String(value);
        if (str.length <= 4) return '****';
        return str.substring(0, 2) + '****' + str.substring(str.length - 2);
    }
}

export default TensionRouter;
