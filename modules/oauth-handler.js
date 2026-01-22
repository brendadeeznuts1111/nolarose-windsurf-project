#!/usr/bin/env bun

// modules/oauth-handler.js - Isolated OAuth Module
// Cash App OAuth flow management with token caching and security

import { createHash, randomBytes } from 'crypto';

console.log("🔐 OAuth Handler Module - Loaded");

/**
 * OAuth Handler for Cash App integration
 * 
 * Manages OAuth flows, token caching, and security:
 * - Authorization URL generation
 * - Token exchange and validation
 * - Secure state management
 * - Token refresh and caching
 */
export class OAuthHandler {
    constructor(config = {}) {
        this.config = {
            clientId: config.clientId || process.env.CASH_APP_CLIENT_ID,
            clientSecret: config.clientSecret || process.env.CASH_APP_CLIENT_SECRET,
            redirectUri: config.redirectUri || process.env.CASH_APP_REDIRECT_URI,
            scope: config.scope || 'wallet:read wallet:write',
            tokenExpiry: config.tokenExpiry || 3600, // 1 hour
            stateExpiry: config.stateExpiry || 600, // 10 minutes
            ...config
        };
        
        this.tokenCache = new Map();
        this.stateStore = new Map();
        this.metrics = {
            totalFlows: 0,
            successfulAuths: 0,
            failedAuths: 0,
            averageFlowTime: 0
        };
        
        this.initialized = false;
    }
    
    /**
     * Initialize OAuth handler
     */
    async init() {
        if (this.initialized) return;
        
        try {
            // Validate configuration
            this.validateConfig();
            
            // Clean expired tokens and states
            this.cleanupExpired();
            
            this.initialized = true;
            console.log('✅ OAuth Handler initialized');
            
        } catch (error) {
            console.error('❌ OAuth Handler initialization failed:', error);
            throw error;
        }
    }
    
    /**
     * Initiate Cash App OAuth flow
     */
    async initiateCashAppFlow(userData, identityResult) {
        const startTime = performance.now();
        this.metrics.totalFlows++;
        
        try {
            console.log(`🔐 Initiating OAuth flow for user: ${this.maskPII(userData.userId)}`);
            
            // Create verification token
            const verificationToken = this.createVerificationToken(identityResult);
            
            // Generate secure state
            const state = this.generateStateToken(userData.userId, identityResult);
            
            // Build authorization URL
            const authUrl = this.buildAuthUrl(verificationToken, state);
            
            // Cache state for callback validation
            this.stateStore.set(state, {
                userId: userData.userId,
                verificationToken,
                timestamp: Date.now(),
                identityResult
            });
            
            const flowTime = performance.now() - startTime;
            this.updateMetrics(flowTime, true);
            
            return {
                success: true,
                flowId: verificationToken,
                state,
                authorizationUrl: authUrl,
                expiresAt: new Date(Date.now() + this.config.stateExpiry * 1000).toISOString(),
                flowTime: flowTime.toFixed(2)
            };
            
        } catch (error) {
            const flowTime = performance.now() - startTime;
            this.updateMetrics(flowTime, false);
            
            console.error('❌ OAuth flow initiation failed:', error);
            return {
                success: false,
                error: error.message,
                flowTime: flowTime.toFixed(2)
            };
        }
    }
    
    /**
     * Handle Cash App OAuth callback
     */
    async handleCashAppCallback(code, state) {
        const startTime = performance.now();
        
        try {
            console.log('🔄 Processing OAuth callback');
            
            // Validate state
            const storedState = this.stateStore.get(state);
            if (!storedState) {
                throw new Error('Invalid or expired state');
            }
            
            // Check state expiry
            if (Date.now() - storedState.timestamp > this.config.stateExpiry * 1000) {
                this.stateStore.delete(state);
                throw new Error('State expired');
            }
            
            // Exchange authorization code for tokens
            const tokenResponse = await this.exchangeCodeForTokens(code);
            
            // Validate tokens
            const validatedTokens = await this.validateTokens(tokenResponse);
            
            // Cache tokens
            this.tokenCache.set(storedState.userId, {
                accessToken: validatedTokens.access_token,
                refreshToken: validatedTokens.refresh_token,
                expiresAt: Date.now() + (validatedTokens.expires_in * 1000),
                scope: validatedTokens.scope,
                identityResult: storedState.identityResult
            });
            
            // Clean up state
            this.stateStore.delete(state);
            
            const callbackTime = performance.now() - startTime;
            
            return {
                success: true,
                userId: this.maskPII(storedState.userId),
                accessToken: validatedTokens.access_token.substring(0, 20) + '...',
                scope: validatedTokens.scope,
                expiresAt: new Date(Date.now() + validatedTokens.expires_in * 1000).toISOString(),
                callbackTime: callbackTime.toFixed(2)
            };
            
        } catch (error) {
            console.error('❌ OAuth callback processing failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
    
    /**
     * Get cached token for user
     */
    getCachedToken(userId) {
        const cached = this.tokenCache.get(userId);
        if (!cached) return null;
        
        // Check if token is expired
        if (Date.now() > cached.expiresAt) {
            this.tokenCache.delete(userId);
            return null;
        }
        
        return cached;
    }
    
    /**
     * Refresh access token
     */
    async refreshToken(userId) {
        const cached = this.tokenCache.get(userId);
        if (!cached || !cached.refreshToken) {
            throw new Error('No refresh token available');
        }
        
        try {
            const response = await this.makeTokenRequest({
                grant_type: 'refresh_token',
                refresh_token: cached.refreshToken
            });
            
            // Update cached token
            this.tokenCache.set(userId, {
                ...cached,
                accessToken: response.access_token,
                expiresAt: Date.now() + (response.expires_in * 1000),
                scope: response.scope
            });
            
            return response.access_token;
            
        } catch (error) {
            // Remove invalid token
            this.tokenCache.delete(userId);
            throw error;
        }
    }
    
    /**
     * Create verification token
     */
    createVerificationToken(identityResult) {
        const payload = {
            verificationId: this.generateId(),
            userId: identityResult.userId,
            timestamp: Date.now(),
            confidence: identityResult.confidence
        };
        
        return Buffer.from(JSON.stringify(payload)).toString('base64');
    }
    
    /**
     * Generate secure state token
     */
    generateStateToken(userId, identityResult) {
        const payload = {
            userId,
            verificationId: identityResult.verificationId,
            nonce: randomBytes(16).toString('hex'),
            timestamp: Date.now()
        };
        
        const state = Buffer.from(JSON.stringify(payload)).toString('base64');
        const signature = createHash('sha256').update(state + this.config.clientSecret).digest('hex');
        
        return state + '.' + signature;
    }
    
    /**
     * Build authorization URL
     */
    buildAuthUrl(verificationToken, state) {
        const params = new URLSearchParams({
            response_type: 'code',
            client_id: this.config.clientId,
            redirect_uri: this.config.redirectUri,
            scope: this.config.scope,
            state: state,
            verification_token: verificationToken
        });
        
        return `https://cash.app/oauth/authorize?${params.toString()}`;
    }
    
    /**
     * Exchange authorization code for tokens
     */
    async exchangeCodeForTokens(code) {
        return this.makeTokenRequest({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: this.config.redirectUri
        });
    }
    
    /**
     * Make token request to Cash App
     */
    async makeTokenRequest(params) {
        const response = await fetch('https://cash.app/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Basic ${Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64')}`
            },
            body: new URLSearchParams(params).toString()
        });
        
        if (!response.ok) {
            throw new Error(`Token request failed: ${response.status} ${response.statusText}`);
        }
        
        return response.json();
    }
    
    /**
     * Validate tokens
     */
    async validateTokens(tokenResponse) {
        // Basic validation - in production, verify with Cash App
        if (!tokenResponse.access_token || !tokenResponse.expires_in) {
            throw new Error('Invalid token response');
        }
        
        return tokenResponse;
    }
    
    /**
     * Validate configuration
     */
    validateConfig() {
        const required = ['clientId', 'clientSecret', 'redirectUri'];
        const missing = required.filter(key => !this.config[key]);
        
        if (missing.length > 0) {
            throw new Error(`Missing required OAuth config: ${missing.join(', ')}`);
        }
    }
    
    /**
     * Clean expired tokens and states
     */
    cleanupExpired() {
        const now = Date.now();
        
        // Clean expired tokens
        for (const [userId, token] of this.tokenCache.entries()) {
            if (now > token.expiresAt) {
                this.tokenCache.delete(userId);
            }
        }
        
        // Clean expired states
        for (const [state, data] of this.stateStore.entries()) {
            if (now - data.timestamp > this.config.stateExpiry * 1000) {
                this.stateStore.delete(state);
            }
        }
    }
    
    /**
     * Update metrics
     */
    updateMetrics(flowTime, success) {
        if (success) {
            this.metrics.successfulAuths++;
        } else {
            this.metrics.failedAuths++;
        }
        
        const totalFlows = this.metrics.totalFlows;
        const currentAvg = this.metrics.averageFlowTime;
        this.metrics.averageFlowTime = 
            (currentAvg * (totalFlows - 1) + flowTime) / totalFlows;
    }
    
    /**
     * Get module metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            successRate: this.metrics.totalFlows > 0 
                ? (this.metrics.successfulAuths / this.metrics.totalFlows) * 100 
                : 0,
            cachedTokens: this.tokenCache.size,
            activeStates: this.stateStore.size
        };
    }
    
    /**
     * Health check
     */
    async healthCheck() {
        try {
            // Check configuration
            this.validateConfig();
            
            // Clean expired data
            this.cleanupExpired();
            
            return {
                status: 'healthy',
                initialized: this.initialized,
                metrics: this.getMetrics(),
                config: {
                    hasClientId: !!this.config.clientId,
                    hasClientSecret: !!this.config.clientSecret,
                    redirectUri: this.config.redirectUri
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
        return this.initialized && !!this.config.clientId;
    }
    
    /**
     * Shutdown module
     */
    async shutdown() {
        console.log('🔄 Shutting down OAuth Handler...');
        
        this.tokenCache.clear();
        this.stateStore.clear();
        this.initialized = false;
        
        console.log('✅ OAuth Handler shutdown complete');
    }
    
    /**
     * Generate random ID
     */
    generateId() {
        return randomBytes(16).toString('hex');
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

export default OAuthHandler;
