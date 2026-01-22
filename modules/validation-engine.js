#!/usr/bin/env bun

// modules/validation-engine.js - Isolated Validation Module
// Cross-validation, fuzzy matching, and verification logic

console.log("🔍 Validation Engine Module - Loaded");

/**
 * Validation Engine for cross-validation and fuzzy matching
 * 
 * Handles validation logic, fuzzy matching, and cross-validation:
 * - Pre-screening validation
 * - Cross-validation of multiple verification sources
 * - Fuzzy string matching algorithms
 * - Risk assessment and confidence scoring
 */
export class ValidationEngine {
    constructor(config = {}) {
        // Validate configuration thresholds
        if (config.fuzzyThreshold !== undefined) {
            if (typeof config.fuzzyThreshold !== 'number' || config.fuzzyThreshold < 0 || config.fuzzyThreshold > 1) {
                throw new Error('fuzzyThreshold must be between 0 and 1');
            }
        }
        
        if (config.phoneMatchThreshold !== undefined) {
            if (typeof config.phoneMatchThreshold !== 'number' || config.phoneMatchThreshold < 0 || config.phoneMatchThreshold > 1) {
                throw new Error('phoneMatchThreshold must be between 0 and 1');
            }
        }
        
        if (config.emailMatchThreshold !== undefined) {
            if (typeof config.emailMatchThreshold !== 'number' || config.emailMatchThreshold < 0 || config.emailMatchThreshold > 1) {
                throw new Error('emailMatchThreshold must be between 0 and 1');
            }
        }
        
        if (config.nameMatchThreshold !== undefined) {
            if (typeof config.nameMatchThreshold !== 'number' || config.nameMatchThreshold < 0 || config.nameMatchThreshold > 1) {
                throw new Error('nameMatchThreshold must be between 0 and 1');
            }
        }
        
        this.config = {
            fuzzyThreshold: config.fuzzyThreshold || 0.8,
            phoneMatchThreshold: config.phoneMatchThreshold || 0.9,
            emailMatchThreshold: config.emailMatchThreshold || 0.85,
            nameMatchThreshold: config.nameMatchThreshold || 0.75,
            verificationExpiry: config.verificationExpiry || 86400000, // 24 hours
            maxRetries: config.maxRetries || 3,
            ...config
        };
        
        this.verificationStore = new Map();
        this.validationCache = new Map();
        this._metrics = {
            totalValidations: 0,
            successfulValidations: 0,
            failedValidations: 0,
            averageValidationTime: 0,
            crossValidations: 0,
            fuzzyMatches: 0
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize validation engine
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Validate configuration
            this.validateConfig();
            
            // Clean expired verifications
            this.cleanupExpired();
            
            this.initialized = true;
            console.log('✅ Validation Engine initialized');
            
        } catch (error) {
            console.error('❌ Validation Engine initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Pre-screen user for basic validation
     */
    async preScreenUser(userData) {
        const startTime = performance.now();
        
        try {
            console.log(`🔍 Pre-screening user: ${this.maskPII(userData.userId)}`);
            
            const preScreen = {
                userId: userData.userId,
                passed: true,
                issues: [],
                score: 100,
                timestamp: Date.now()
            };
            
            // Basic field validation
            if (!userData.email || !this.isValidEmail(userData.email)) {
                preScreen.passed = false;
                preScreen.issues.push('Invalid email format');
                preScreen.score -= 30;
            }
            
            if (!userData.phone || !this.isValidPhone(userData.phone)) {
                preScreen.passed = false;
                preScreen.issues.push('Invalid phone format');
                preScreen.score -= 25;
            }
            
            if (!userData.userId || userData.userId.length < 3) {
                preScreen.passed = false;
                preScreen.issues.push('Invalid user ID');
                preScreen.score -= 20;
            }
            
            // Check for suspicious patterns
            const suspiciousResult = this.hasSuspiciousPatterns(userData);
            if (suspiciousResult) {
                preScreen.passed = false;
                preScreen.issues.push('Suspicious patterns detected');
                preScreen.score -= 40;
            }
            
            // Rate limiting check
            const rateLimitedResult = this.isRateLimited(userData.userId);
            if (rateLimitedResult) {
                preScreen.passed = false;
                preScreen.issues.push('Rate limit exceeded');
                preScreen.score -= 50;
            }
            
            const validationTime = performance.now() - startTime;
            preScreen.validationTime = validationTime.toFixed(2);
            
            console.log(`Pre-screen result: ${preScreen.passed ? 'PASSED' : 'FAILED'} (${preScreen.score})`);
            
            return preScreen;
            
        } catch (error) {
            console.error('❌ Pre-screen validation failed:', error);
            return {
                passed: false,
                issues: [error.message],
                score: 0,
                userId: userData.userId
            };
        }
    }
    
    /**
     * Cross-validate all verification sources
     */
    crossValidateAll(identityResult, cashAppResult, plaidResult) {
        const startTime = performance.now();
        this._metrics.totalValidations++;
        this._metrics.crossValidations++;
        
        try {
            // Create a cache key based on input data
            const cacheKey = this.generateCacheKey(identityResult, cashAppResult, plaidResult);
            
            // Check if we already have this verification cached
            if (this.verificationStore.has(cacheKey)) {
                const cached = this.verificationStore.get(cacheKey);
                return cached;
            }
            
            const verification = {
                verificationId: this.generateVerificationId(),
                userId: identityResult.userId,
                timestamp: Date.now(),
                sources: {
                    identity: identityResult.success || false,
                    cashApp: (cashAppResult?.success) || false,
                    plaid: (plaidResult?.success) || false
                },
                validation: {
                    passed: true,
                    confidence: 0,
                    riskScore: 0,
                    issues: [],
                    matches: {}
                },
                crossValidation: {
                    identityCashApp: 0,
                    identityPlaid: 0,
                    cashAppPlaid: 0,
                    overallConsistency: 0
                }
            };
            
            // Cross-validate identity with Cash App
            if (identityResult.success && cashAppResult?.success) {
                verification.crossValidation.identityCashApp = 
                    this.validateIdentityCashAppMatch(identityResult, cashAppResult);
            }
            
            // Cross-validate identity with Plaid
            if (identityResult.success && plaidResult?.success) {
                verification.crossValidation.identityPlaid = 
                    this.validateIdentityPlaidMatch(identityResult, plaidResult);
            }
            
            // Cross-validate Cash App with Plaid
            if (cashAppResult?.success && plaidResult?.success) {
                verification.crossValidation.cashAppPlaid = 
                    this.validateCashAppPlaidMatch(cashAppResult, plaidResult);
            }
            
            // Calculate overall consistency
            const scores = Object.values(verification.crossValidation).filter(score => score > 0);
            verification.crossValidation.overallConsistency = 
                scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
            
            // Determine if validation passed
            verification.validation.passed = this.determineValidationPass(verification);
            
            // Calculate confidence score
            verification.validation.confidence = this.calculateConfidence(verification);
            
            // Calculate risk score
            verification.validation.riskScore = this.calculateRiskScore(verification);
            
            // Identify issues
            verification.validation.issues = this.identifyIssues(verification);
            
            // Cache verification
            this.verificationStore.set(cacheKey, verification);
            
            const validationTime = performance.now() - startTime;
            this.updateMetrics(validationTime, verification.validation.passed);
            
            verification.validationTime = validationTime.toFixed(2);
            verification.validationPassed = verification.validation.passed;
            verification.success = verification.validation.passed; // Add success property for test compatibility
            
            return verification;
            
        } catch (error) {
            console.error('❌ Cross-validation failed:', error);
            this._metrics.failedValidations++;
            
            return {
                verificationId: this.generateVerificationId(),
                userId: identityResult.userId,
                success: false,
                error: error.message,
                validationPassed: false
            };
        }
    }
    
    /**
     * Validate identity and Cash App match
     */
    validateIdentityCashAppMatch(identityResult, cashAppResult) {
        let score = 0;
        const matches = {};
        
        // Email matching
        if (identityResult.email && cashAppResult.email) {
            const emailScore = this.fuzzyMatch(identityResult.email, cashAppResult.email);
            matches.email = emailScore;
            if (emailScore >= this.config.emailMatchThreshold) score += 30;
        }
        
        // Phone matching
        if (identityResult.phone && cashAppResult.phone) {
            const phoneScore = this.comparePhoneNumbers(identityResult.phone, cashAppResult.phone);
            matches.phone = phoneScore;
            if (phoneScore >= this.config.phoneMatchThreshold) score += 35;
        }
        
        // Name matching
        if (identityResult.name && cashAppResult.name) {
            const nameScore = this.fuzzyMatch(identityResult.name, cashAppResult.name);
            matches.name = nameScore;
            if (nameScore >= this.config.nameMatchThreshold) score += 25;
        }
        
        // User ID matching
        if (identityResult.userId === cashAppResult.userId) {
            matches.userId = 1.0;
            score += 10;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Validate identity and Plaid match
     */
    validateIdentityPlaidMatch(identityResult, plaidResult) {
        let score = 0;
        const matches = {};
        
        // Email matching
        if (identityResult.email && plaidResult.email) {
            const emailScore = this.fuzzyMatch(identityResult.email, plaidResult.email);
            matches.email = emailScore;
            if (emailScore >= this.config.emailMatchThreshold) score += 30;
        }
        
        // Phone matching
        if (identityResult.phone && plaidResult.phone) {
            const phoneScore = this.comparePhoneNumbers(identityResult.phone, plaidResult.phone);
            matches.phone = phoneScore;
            if (phoneScore >= this.config.phoneMatchThreshold) score += 35;
        }
        
        // Account matching
        if (identityResult.accountNumber && plaidResult.accounts?.length > 0) {
            const accountScore = this.validateAccountMatch(identityResult, plaidResult.accounts);
            matches.account = accountScore;
            if (accountScore >= this.config.fuzzyThreshold) score += 35;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Validate Cash App and Plaid match
     */
    validateCashAppPlaidMatch(cashAppResult, plaidResult) {
        let score = 0;
        
        // Email matching
        if (cashAppResult.email && plaidResult.email) {
            const emailScore = this.fuzzyMatch(cashAppResult.email, plaidResult.email);
            if (emailScore >= this.config.emailMatchThreshold) score += 40;
        }
        
        // Phone matching
        if (cashAppResult.phone && plaidResult.phone) {
            const phoneScore = this.comparePhoneNumbers(cashAppResult.phone, plaidResult.phone);
            if (phoneScore >= this.config.phoneMatchThreshold) score += 60;
        }
        
        return Math.min(score, 100);
    }
    
    /**
     * Fuzzy string matching using Levenshtein distance
     */
    fuzzyMatch(str1, str2) {
        // Handle empty strings - they should be considered a perfect match
        if (str1 === '' && str2 === '') return 1.0;
        if (!str1 || !str2) return 0;
        
        const s1 = str1.toLowerCase().trim();
        const s2 = str2.toLowerCase().trim();
        
        if (s1 === s2) return 1.0;
        
        const distance = this.levenshteinDistance(s1, s2);
        const maxLength = Math.max(s1.length, s2.length);
        
        if (maxLength === 0) return 1.0;
        
        const similarity = 1 - (distance / maxLength);
        this._metrics.fuzzyMatches++;
        
        return similarity;
    }
    
    /**
     * Calculate Levenshtein distance between two strings
     */
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    }
    
    /**
     * Compare phone numbers (handles different formats)
     */
    comparePhoneNumbers(phone1, phone2) {
        if (!phone1 || !phone2) return 0;
        
        // Normalize phone numbers (remove formatting but keep digits)
        const normalized1 = phone1.replace(/\D/g, '');
        const normalized2 = phone2.replace(/\D/g, '');
        
        // Check for invalid phone numbers (no digits or too short/long)
        if (normalized1.length < 7 || normalized1.length > 15 || 
            normalized2.length < 7 || normalized2.length > 15) {
            return 0;
        }
        
        if (normalized1 === normalized2) return 1.0;
        
        // Special case: if both have the same 10 digits but one has +1 country code
        const stripped1 = normalized1.replace(/^1/, '');
        const stripped2 = normalized2.replace(/^1/, '');
        
        if (stripped1 === stripped2 && stripped1.length === 10) {
            // Check if original numbers had real formatting characters (parentheses, dashes, spaces) vs just country code
            const hasRealFormatting1 = /[()\- ]/.test(phone1);
            const hasRealFormatting2 = /[()\- ]/.test(phone2);
            
            if (hasRealFormatting1 || hasRealFormatting2) {
                return 1.0; // Different formatting, same number
            } else {
                return 0.9; // Pure country code difference
            }
        }
        
        // Check if one is a subset of the other (handles other differences)
        if (normalized1.includes(normalized2) || normalized2.includes(normalized1)) {
            return 0.9;
        }
        
        // Use fuzzy matching for close matches
        return this.fuzzyMatch(normalized1, normalized2);
    }
    
    /**
     * Normalize phone number for comparison
     */
    normalizePhoneNumber(phone) {
        return phone
            .replace(/\D/g, '') // Remove all non-digits
            .replace(/^1/, '') // Remove US country code if present
            .substring(0, 10); // Take last 10 digits
    }
    
    /**
     * Validate account match
     */
    validateAccountMatch(identity, accounts) {
        if (!identity.accountNumber || !accounts.length) return 0;
        
        // Simple account number validation (in real implementation, use proper masking)
        const identityAccount = identity.accountNumber.replace(/\D/g, '');
        
        for (const account of accounts) {
            const accountNumber = account.account_id?.replace(/\D/g, '') || '';
            if (accountNumber && accountNumber.includes(identityAccount)) {
                return 1.0;
            }
        }
        
        return 0;
    }
    
    /**
     * Determine if validation passed
     */
    determineValidationPass(verification) {
        const { sources, crossValidation, validation } = verification;
        
        // Must have at least identity verification
        if (!sources.identity) {
            return false;
        }
        
        // Count successful sources (not null/undefined)
        const successfulSources = Object.values(verification.sources).filter(Boolean).length;
        
        // If we only have identity verification, pass
        if (successfulSources === 1) {
            return true;
        }
        
        // If we have multiple successful sources, check consistency
        if (successfulSources > 1) {
            const consistencyDecimal = crossValidation.overallConsistency / 100; // Convert percentage to decimal
            
            // Adjust threshold based on number of sources - be more lenient with missing sources
            let adjustedThreshold = this.config.fuzzyThreshold;
            if (successfulSources === 2) {
                adjustedThreshold = this.config.fuzzyThreshold * 0.8; // 20% more lenient with 2 sources
            }
            
            // Check if consistency is below threshold
            if (consistencyDecimal < adjustedThreshold) {
                return false; // Multiple sources but inconsistent
            }
        }
        
        return true;
    }
    
    /**
     * Calculate confidence score
     */
    calculateConfidence(verification) {
        let confidence = 0;
        
        // Source availability - reduce base score when consistency is low
        const consistencyDecimal = verification.crossValidation.overallConsistency / 100;
        const availableSources = Object.values(verification.sources).filter(Boolean).length;
        
        if (consistencyDecimal < 0.5) {
            confidence += availableSources * 10; // Reduced base score for low consistency
        } else {
            confidence += availableSources * 20; // Normal base score
        }
        
        // Cross-validation consistency - penalize low consistency heavily
        if (consistencyDecimal < 0.5) {
            confidence += consistencyDecimal * 5; // Even heavier penalty for low consistency
        } else {
            confidence += verification.crossValidation.overallConsistency * 0.3; // Normal calculation
        }
        
        // Individual cross-validation scores - only give bonus if consistency is good
        const scores = Object.values(verification.crossValidation).filter(score => score > 0);
        if (scores.length > 1 && consistencyDecimal >= 0.5) {
            confidence += 20;
        }
        
        return Math.min(confidence, 100);
    }
    
    /**
     * Calculate risk score
     */
    calculateRiskScore(verification) {
        let riskScore = 0;
        
        // Inconsistent information increases risk
        if (verification.crossValidation.overallConsistency < 0.5) {
            riskScore += 30;
        }
        
        // Missing verification sources increases risk
        const missingSources = Object.values(verification.sources).filter(v => !v).length;
        riskScore += missingSources * 15;
        
        // Low confidence increases risk
        if (verification.validation.confidence < 70) {
            riskScore += 20;
        }
        
        return Math.min(riskScore, 100);
    }
    
    /**
     * Identify validation issues
     */
    identifyIssues(verification) {
        const issues = [];
        
        if (!verification.sources.identity) {
            issues.push('Identity verification failed');
        }
        
        if (verification.crossValidation.overallConsistency < 0.7) {
            issues.push('Inconsistent information across sources');
        }
        
        if (verification.validation.confidence < 60) {
            issues.push('Low confidence in verification');
        }
        
        if (verification.validation.riskScore > 50) {
            issues.push('High risk detected');
        }
        
        return issues;
    }
    
    /**
     * Get verification status
     */
    async getVerificationStatus(verificationId) {
        const verification = this.verificationStore.get(verificationId);
        
        if (!verification) {
            return {
                found: false,
                error: 'Verification not found'
            };
        }
        
        return {
            found: true,
            verification: {
                verificationId,
                userId: this.maskPII(verification.userId),
                passed: verification.validation.passed,
                confidence: verification.validation.confidence,
                riskScore: verification.validation.riskScore,
                timestamp: verification.timestamp
            }
        };
    }
    
    /**
     * Mask PII for logging
     */
    maskPII(data) {
        if (!data) return 'undefined';
        if (typeof data === 'string' && data.length > 4) {
            return data.substring(0, 2) + '****' + data.substring(data.length - 2);
        }
        return '***';
    }
    
    /**
     * Validate email format
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    
    /**
     * Validate phone format
     */
    isValidPhone(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    
    /**
     * Check for suspicious patterns
     */
    hasSuspiciousPatterns(userData) {
        const suspicious = [
            /test/i,
            /demo/i,
            /fake/i,
            /temp/i,
            /00000/
        ];
        
        const checkString = `${userData.email} ${userData.phone} ${userData.userId}`;
        
        return suspicious.some(pattern => pattern.test(checkString));
    }
    
    /**
     * Check if user is rate limited
     */
    isRateLimited(userId) {
        const now = Date.now();
        const userAttempts = this.validationCache.get(userId) || [];
        
        // Clean old attempts (older than 1 hour)
        const recentAttempts = userAttempts.filter(time => now - time < 3600000);
        
        // Update cache
        this.validationCache.set(userId, [...recentAttempts, now]);
        
        // Check if exceeded limit (5 attempts per hour)
        return recentAttempts.length >= 5;
    }
    
    /**
     * Validate configuration
     */
    validateConfig() {
        const thresholds = [
            'fuzzyThreshold',
            'phoneMatchThreshold',
            'emailMatchThreshold',
            'nameMatchThreshold'
        ];
        
        for (const threshold of thresholds) {
            const value = this.config[threshold];
            if (value < 0 || value > 1) {
                throw new Error(`${threshold} must be between 0 and 1`);
            }
        }
    }
    
    /**
     * Clean expired verifications
     */
    cleanupExpired() {
        const now = Date.now();
        
        for (const [id, verification] of this.verificationStore.entries()) {
            if (now - verification.timestamp > this.config.verificationExpiry) {
                this.verificationStore.delete(id);
            }
        }
        
        // Clean validation cache
        for (const [userId, attempts] of this.validationCache.entries()) {
            const recent = attempts.filter(time => now - time < 3600000);
            if (recent.length === 0) {
                this.validationCache.delete(userId);
            } else {
                this.validationCache.set(userId, recent);
            }
        }
    }
    
    /**
     * Update metrics
     */
    updateMetrics(validationTime, success) {
        this._metrics.totalValidations++;
        
        if (success) {
            this._metrics.successfulValidations++;
        } else {
            this._metrics.failedValidations++;
        }
        
        const totalValidations = this._metrics.totalValidations;
        const currentAvg = this._metrics.averageValidationTime;
        this._metrics.averageValidationTime = 
            (currentAvg * (totalValidations - 1) + validationTime) / totalValidations;
    }
    
    /**
     * Get module metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalValidations > 0 
                ? (this.metrics.successfulValidations / this.metrics.totalValidations) * 100 
                : 0,
            cachedVerifications: this.verificationStore.size,
            rateLimitedUsers: this.validationCache.size
        };
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Validate configuration
            this.validateConfig();
            
            // Clean expired data
            this.cleanupExpired();
            
            return {
                status: 'healthy',
                initialized: this.initialized,
                metrics: this.getMetrics(),
                config: {
                    fuzzyThreshold: this.config.fuzzyThreshold,
                    phoneMatchThreshold: this.config.phoneMatchThreshold,
                    emailMatchThreshold: this.config.emailMatchThreshold,
                    nameMatchThreshold: this.config.nameMatchThreshold
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
        console.log('🔄 Shutting down Validation Engine...');
        
        this.verificationStore.clear();
        this.validationCache.clear();
        this.initialized = false;
        
        console.log('✅ Validation Engine shutdown complete');
    }
    
    /**
     * Generate cache key based on input data
     */
    generateCacheKey(identityResult, cashAppResult, plaidResult) {
        const key = {
            identity: {
                userId: identityResult.userId,
                email: identityResult.email,
                phone: identityResult.phone,
                accountNumber: identityResult.accountNumber
            },
            cashApp: cashAppResult ? {
                userId: cashAppResult.userId,
                email: cashAppResult.email,
                phone: cashAppResult.phone,
                accountNumber: cashAppResult.accountNumber
            } : null,
            plaid: plaidResult ? {
                userId: plaidResult.userId,
                email: plaidResult.email,
                phone: plaidResult.phone,
                accountNumber: plaidResult.accountNumber
            } : null
        };
        
        return Buffer.from(JSON.stringify(key)).toString('base64');
    }
    
    /**
     * Generate verification ID
     */
    generateVerificationId() {
        return `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    get metrics() {
        return {
            ...this._metrics,
            successRate: this._metrics.totalValidations > 0 
                ? (this._metrics.successfulValidations / this._metrics.totalValidations) * 100 
                : 0
        };
    }
    
    set metrics(value) {
        this._metrics = value;
    }
    
    /**
     * Mask sensitive data for logging
     */
    maskSensitiveData(value) {
        if (!value) return 'undefined';
        const str = String(value);
        if (str.length <= 4) return '****';
        return str.substring(0, 2) + '****' + str.substring(str.length - 2);
    }
}

export default ValidationEngine;
