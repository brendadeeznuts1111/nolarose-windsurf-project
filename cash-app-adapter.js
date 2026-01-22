#!/usr/bin/env bun

// cash-app-adapter.js - Modular Core Adapter v3.0
// Composable, testable, and backward-compatible Cash App verification system

import { OAuthHandler } from './modules/oauth-handler.js';
import { PlaidVerifier } from './modules/plaid-verifier.js';
import { ValidationEngine } from './modules/validation-engine.js';
import { TensionRouter } from './modules/tension-router.js';
import { loadConfig } from './config/config-loader.js';

console.log("🚀 Cash App Verification Adapter v3.0 - Modular Core");
console.log("=" .repeat(55));

/**
 * Modular Cash App Verification Adapter
 * 
 * Transforms from monolithic class to composable modules:
 * - OAuthHandler: Cash App OAuth flow management
 * - PlaidVerifier: Bank account verification via Plaid
 * - ValidationEngine: Cross-validation and fuzzy matching
 * - TensionRouter: Adaptive routing and tier decisions
 */
export class CashAppVerificationAdapter {
    constructor(gdprValidator, config = {}) {
        // Core dependencies
        this.validator = gdprValidator;
        this.gdprModule = gdprValidator.gdprModule;
        this.eventBus = gdprValidator.eventBus;
        
        // Store config for later loading
        this.config = config;
        
        // Core state management
        this.tokenCache = new Map();
        this.sessionStore = new Map();
        this.metrics = {
            totalRequests: 0,
            successfulVerifications: 0,
            averageResponseTime: 0,
            moduleLoadTime: 0
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize adapter and modules
     */
    async init() {
        if (this.initialized) return;
        
        const startTime = performance.now();
        
        try {
            // Load TOML configuration
            this.config = {
                ...await loadConfig(),
                ...this.config
            };
            
            // Modular injection - composable architecture
            this.oauth = new OAuthHandler(this.config.cashApp);
            this.plaid = new PlaidVerifier(this.config.plaid);
            this.validation = new ValidationEngine();
            this.router = new TensionRouter(this.config.verifier);
            
            // Initialize all modules
            await Promise.all([
                this.oauth.init(),
                this.plaid.init(),
                this.validation.init(),
                this.router.init()
            ]);
            
            this.metrics.moduleLoadTime = performance.now() - startTime;
            this.initialized = true;
            
            this.eventBus.emit('adapter:initialized', {
                loadTime: this.metrics.moduleLoadTime,
                modules: ['oauth', 'plaid', 'validation', 'router']
            });
            
            console.log(`✅ Adapter v3.0 initialized in ${this.metrics.moduleLoadTime.toFixed(2)}ms`);
            
        } catch (error) {
            console.error('❌ Adapter initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Ensure adapter is initialized before use
     */
    async ensureInitialized() {
        if (!this.initialized) {
            await this.init();
        }
    }
    
    /**
     * Main verification flow - orchestrates all modules
     */
    async verifyWalletFunding(userData) {
        await this.ensureInitialized();
        
        const startTime = performance.now();
        this.metrics.totalRequests++;
        
        try {
            console.log(`🔍 Starting verification for user: ${this.maskPII(userData.userId)}`);
            
            // Pre-screen user via validation engine
            const preScreen = await this.validation.preScreenUser(userData);
            if (!preScreen.passed) {
                return this.router.createRejectionResponse(preScreen, 'PRE_SCREEN_FAILED');
            }
            
            // Identity validation via GDPR validator
            const identityResult = await this.validator.validateIdentity({
                userId: userData.userId,
                email: userData.email,
                phone: userData.phone,
                documents: userData.documents
            });
            
            // Adaptive routing decision via tension router
            const approvalDecision = this.router.applyAdaptiveStrategy(identityResult);
            if (approvalDecision.tier === 'REJECT') {
                return this.router.createRejectionResponse(identityResult, 'HIGH_RISK');
            }
            
            // Cash App OAuth flow (if required)
            let cashAppResult = null;
            if (approvalDecision.requiresCashAppVerification) {
                cashAppResult = await this.oauth.initiateCashAppFlow(userData, identityResult);
            }
            
            // Plaid bank verification
            const plaidResult = await this.plaid.verifyBankAccount(userData, identityResult);
            
            // Cross-validate all results
            const finalResult = this.validation.crossValidateAll(
                identityResult, 
                cashAppResult, 
                plaidResult
            );
            
            // Route to appropriate tier
            const routing = await this.router.routeToTier(finalResult, approvalDecision);
            
            // Update metrics
            const responseTime = performance.now() - startTime;
            this.updateMetrics(responseTime, finalResult.success);
            
            console.log(`✅ Verification completed in ${responseTime.toFixed(2)}ms`);
            
            return {
                success: true,
                userId: this.maskPII(userData.userId),
                verificationId: finalResult.verificationId,
                tier: routing.tier,
                confidence: finalResult.confidence,
                requiresManualReview: routing.requiresManualReview,
                responseTime: responseTime.toFixed(2),
                modules: {
                    oauth: cashAppResult?.success || false,
                    plaid: plaidResult?.success || false,
                    validation: finalResult.validationPassed,
                    routing: routing.automated
                },
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Verification failed:', error);
            this.eventBus.emit('verification:error', {
                userId: this.maskPII(userData.userId),
                error: error.message,
                stack: error.stack
            });
            
            return {
                success: false,
                error: error.message,
                userId: this.maskPII(userData.userId),
                timestamp: new Date().toISOString()
            };
        }
    }
    
    /**
     * Handle Cash App OAuth callback
     */
    async handleCashAppCallback(code, state) {
        return this.oauth.handleCashAppCallback(code, state);
    }
    
    /**
     * Get verification status
     */
    async getVerificationStatus(verificationId) {
        return this.validation.getVerificationStatus(verificationId);
    }
    
    /**
     * Update adapter metrics
     */
    updateMetrics(responseTime, success) {
        if (success) this.metrics.successfulVerifications++;
        
        // Calculate rolling average response time
        const totalRequests = this.metrics.totalRequests;
        const currentAvg = this.metrics.averageResponseTime;
        this.metrics.averageResponseTime = 
            (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
    }
    
    /**
     * Get adapter performance metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalRequests > 0 
                ? (this.metrics.successfulVerifications / this.metrics.totalRequests) * 100 
                : 0,
            moduleStatus: {
                oauth: this.oauth.isHealthy(),
                plaid: this.plaid.isHealthy(),
                validation: this.validation.isHealthy(),
                router: this.router.isHealthy()
            }
        };
    }
    
    /**
     * Health check for all modules
     */
    async healthCheck() {
        const health = await Promise.all([
            this.oauth.healthCheck(),
            this.plaid.healthCheck(),
            this.validation.healthCheck(),
            this.router.healthCheck()
        ]);
        
        return {
            adapter: 'healthy',
            modules: {
                oauth: health[0],
                plaid: health[1],
                validation: health[2],
                router: health[3]
            },
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            metrics: this.getMetrics()
        };
    }
    
    /**
     * Shutdown all modules gracefully
     */
    async shutdown() {
        console.log('🔄 Shutting down Cash App Adapter v3.0...');
        
        const shutdownPromises = [];
        
        if (this.oauth && typeof this.oauth.shutdown === 'function') {
            shutdownPromises.push(this.oauth.shutdown());
        }
        
        if (this.plaid && typeof this.plaid.shutdown === 'function') {
            shutdownPromises.push(this.plaid.shutdown());
        }
        
        if (this.validation && typeof this.validation.shutdown === 'function') {
            shutdownPromises.push(this.validation.shutdown());
        }
        
        if (this.router && typeof this.router.shutdown === 'function') {
            shutdownPromises.push(this.router.shutdown());
        }
        
        if (shutdownPromises.length > 0) {
            await Promise.all(shutdownPromises);
        }
        
        this.tokenCache.clear();
        this.sessionStore.clear();
        this.initialized = false;
        
        console.log('✅ Adapter v3.0 shutdown complete');
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

// Backward compatibility factory
export async function createCashAppAdapter(gdprValidator, config) {
    const adapter = new CashAppVerificationAdapter(gdprValidator, config);
    await adapter.init();
    return adapter;
}

// Module exports for testing
export { OAuthHandler, PlaidVerifier, ValidationEngine, TensionRouter };

// Default export
export default CashAppVerificationAdapter;
