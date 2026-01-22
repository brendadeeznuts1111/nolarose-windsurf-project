#!/usr/bin/env bun

// __tests__/oauth-handler.test.js - OAuth Handler Module Test Suite
// 100% coverage tests for the OAuth Handler module

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { OAuthHandler } from '../modules/oauth-handler.js';
import { TestDataFactory, TestUtils } from './setup.js';

console.log("🧪 OAuth Handler Test Suite - Loaded");

describe('OAuthHandler Module', () => {
    let oauthHandler;
    let config;
    
    beforeEach(async () => {
        TestUtils.setupTestEnvironment();
        
        config = TestDataFactory.createConfig().cashApp;
        oauthHandler = new OAuthHandler(config);
        await oauthHandler.init();
    });
    
    afterEach(async () => {
        if (oauthHandler) {
            await oauthHandler.shutdown();
        }
        TestUtils.cleanupTestEnvironment();
    });
    
    describe('Module Initialization', () => {
        it('should initialize with correct configuration', () => {
            expect(oauthHandler).toBeDefined();
            expect(oauthHandler.config).toBeDefined();
            expect(oauthHandler.config.clientId).toBe(config.clientId);
            expect(oauthHandler.config.clientSecret).toBe(config.clientSecret);
            expect(oauthHandler.initialized).toBe(true);
        });
        
        it('should validate required configuration', () => {
            expect(() => {
                new OAuthHandler({});
            }).toThrow('Missing required OAuth config: clientId');
        });
        
        it('should initialize token and state stores', () => {
            expect(oauthHandler.tokenCache).toBeInstanceOf(Map);
            expect(oauthHandler.stateStore).toBeInstanceOf(Map);
            expect(oauthHandler.metrics).toBeDefined();
        });
        
        it('should not initialize twice', async () => {
            const initSpy = vi.spyOn(oauthHandler, 'validateConfig');
            
            await oauthHandler.init(); // Second initialization
            
            expect(initSpy).toHaveBeenCalledTimes(0);
        });
    });
    
    describe('initiateCashAppFlow', () => {
        it('should initiate OAuth flow successfully', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            const result = await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(result.success).toBe(true);
            expect(result.flowId).toBeDefined();
            expect(result.state).toBeDefined();
            expect(result.authorizationUrl).toBeDefined();
            expect(result.expiresAt).toBeDefined();
            expect(result.flowTime).toBeDefined();
        });
        
        it('should create verification token', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            const result = await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(result.flowId).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64 format
        });
        
        it('should generate secure state token', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            const result = await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(result.state).toContain('.'); // Should have signature
            expect(result.state.length).toBeGreaterThan(20);
        });
        
        it('should store state for callback validation', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(oauthHandler.stateStore.size).toBe(1);
            
            const storedState = Array.from(oauthHandler.stateStore.values())[0];
            expect(storedState.userId).toBe(userData.userId);
            expect(storedState.verificationToken).toBeDefined();
            expect(storedState.timestamp).toBeDefined();
        });
        
        it('should build correct authorization URL', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            const result = await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(result.authorizationUrl).toContain('cash.app/oauth/authorize');
            expect(result.authorizationUrl).toContain('response_type=code');
            expect(result.authorizationUrl).toContain('client_id=' + config.clientId);
            expect(result.authorizationUrl).toContain('state=' + result.state);
            expect(result.authorizationUrl).toContain('verification_token=' + result.flowId);
        });
        
        it('should handle initialization errors', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            oauthHandler.validateConfig = vi.fn().mockImplementation(() => {
                throw new Error('Configuration error');
            });
            
            const result = await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Configuration error');
        });
        
        it('should update metrics on successful flow', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            const metrics = oauthHandler.getMetrics();
            expect(metrics.totalFlows).toBe(1);
            expect(metrics.successfulAuths).toBe(1);
            expect(metrics.averageFlowTime).toBeGreaterThan(0);
        });
        
        it('should handle flow errors gracefully', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            oauthHandler.buildAuthUrl = vi.fn().mockImplementation(() => {
                throw new Error('URL generation failed');
            });
            
            const result = await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('URL generation failed');
            
            const metrics = oauthHandler.getMetrics();
            expect(metrics.failedAuths).toBe(1);
        });
    });
    
    describe('handleCashAppCallback', () => {
        it('should handle callback successfully', async () => {
            const code = 'auth_code_123';
            const state = 'test_state.signature';
            const userId = 'test_user_123';
            const verificationToken = 'ver_token_123';
            
            // Store state for validation
            oauthHandler.stateStore.set(state, {
                userId,
                verificationToken,
                timestamp: Date.now(),
                identityResult: TestDataFactory.createIdentityResult()
            });
            
            // Mock token exchange
            oauthHandler.exchangeCodeForTokens = vi.fn().mockResolvedValue({
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
                expires_in: 3600,
                scope: 'wallet:read wallet:write'
            });
            
            const result = await oauthHandler.handleCashAppCallback(code, state);
            
            expect(result.success).toBe(true);
            expect(result.userId).toBe('te****23');
            expect(result.accessToken).toMatch(/^access_token_123\.\.\.$/);
            expect(result.scope).toBe('wallet:read wallet:write');
            expect(result.expiresAt).toBeDefined();
            expect(result.callbackTime).toBeDefined();
        });
        
        it('should reject invalid state', async () => {
            const code = 'auth_code_123';
            const state = 'invalid_state';
            
            const result = await oauthHandler.handleCashAppCallback(code, state);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid or expired state');
        });
        
        it('should reject expired state', async () => {
            const code = 'auth_code_123';
            const state = 'test_state.signature';
            const userId = 'test_user_123';
            
            // Store expired state
            oauthHandler.stateStore.set(state, {
                userId,
                verificationToken: 'ver_token_123',
                timestamp: Date.now() - (config.stateExpiry * 1000 + 1000), // Expired
                identityResult: TestDataFactory.createIdentityResult()
            });
            
            const result = await oauthHandler.handleCashAppCallback(code, state);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('State expired');
            expect(oauthHandler.stateStore.has(state)).toBe(false); // Should be cleaned up
        });
        
        it('should handle token exchange errors', async () => {
            const code = 'auth_code_123';
            const state = 'test_state.signature';
            const userId = 'test_user_123';
            
            oauthHandler.stateStore.set(state, {
                userId,
                verificationToken: 'ver_token_123',
                timestamp: Date.now(),
                identityResult: TestDataFactory.createIdentityResult()
            });
            
            oauthHandler.exchangeCodeForTokens = vi.fn().mockRejectedValue(
                new Error('Invalid authorization code')
            );
            
            const result = await oauthHandler.handleCashAppCallback(code, state);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid authorization code');
        });
        
        it('should cache tokens after successful callback', async () => {
            const code = 'auth_code_123';
            const state = 'test_state.signature';
            const userId = 'test_user_123';
            const verificationToken = 'ver_token_123';
            
            oauthHandler.stateStore.set(state, {
                userId,
                verificationToken,
                timestamp: Date.now(),
                identityResult: TestDataFactory.createIdentityResult()
            });
            
            oauthHandler.exchangeCodeForTokens = vi.fn().mockResolvedValue({
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
                expires_in: 3600,
                scope: 'wallet:read wallet:write'
            });
            
            await oauthHandler.handleCashAppCallback(code, state);
            
            expect(oauthHandler.tokenCache.has(userId)).toBe(true);
            
            const cachedToken = oauthHandler.tokenCache.get(userId);
            expect(cachedToken.accessToken).toBe('access_token_123');
            expect(cachedToken.refreshToken).toBe('refresh_token_123');
            expect(cachedToken.expiresAt).toBeGreaterThan(Date.now());
        });
        
        it('should clean up state after successful callback', async () => {
            const code = 'auth_code_123';
            const state = 'test_state.signature';
            const userId = 'test_user_123';
            
            oauthHandler.stateStore.set(state, {
                userId,
                verificationToken: 'ver_token_123',
                timestamp: Date.now(),
                identityResult: TestDataFactory.createIdentityResult()
            });
            
            oauthHandler.exchangeCodeForTokens = vi.fn().mockResolvedValue({
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
                expires_in: 3600,
                scope: 'wallet:read wallet:write'
            });
            
            await oauthHandler.handleCashAppCallback(code, state);
            
            expect(oauthHandler.stateStore.has(state)).toBe(false);
        });
    });
    
    describe('Token Management', () => {
        it('should cache tokens correctly', () => {
            const userId = 'test_user_123';
            const tokenData = {
                accessToken: 'access_token_123',
                refreshToken: 'refresh_token_123',
                expiresAt: Date.now() + 3600000,
                scope: 'wallet:read'
            };
            
            oauthHandler.tokenCache.set(userId, tokenData);
            
            const cached = oauthHandler.getCachedToken(userId);
            expect(cached).toBe(tokenData);
        });
        
        it('should return null for non-existent tokens', () => {
            const result = oauthHandler.getCachedToken('non_existent_user');
            expect(result).toBeNull();
        });
        
        it('should clean up expired tokens', () => {
            const userId1 = 'user1';
            const userId2 = 'user2';
            
            // Valid token
            oauthHandler.tokenCache.set(userId1, {
                accessToken: 'valid_token',
                expiresAt: Date.now() + 3600000
            });
            
            // Expired token
            oauthHandler.tokenCache.set(userId2, {
                accessToken: 'expired_token',
                expiresAt: Date.now() - 1000
            });
            
            const validToken = oauthHandler.getCachedToken(userId1);
            const expiredToken = oauthHandler.getCachedToken(userId2);
            
            expect(validToken).toBeDefined();
            expect(expiredToken).toBeNull();
            expect(oauthHandler.tokenCache.has(userId2)).toBe(false);
        });
        
        it('should refresh tokens successfully', async () => {
            const userId = 'test_user_123';
            const refreshToken = 'refresh_token_123';
            
            oauthHandler.tokenCache.set(userId, {
                accessToken: 'old_access_token',
                refreshToken,
                expiresAt: Date.now() - 1000, // Expired
                scope: 'wallet:read'
            });
            
            oauthHandler.makeTokenRequest = vi.fn().mockResolvedValue({
                access_token: 'new_access_token',
                expires_in: 3600,
                scope: 'wallet:read wallet:write'
            });
            
            const newAccessToken = await oauthHandler.refreshToken(userId);
            
            expect(newAccessToken).toBe('new_access_token');
            
            const cachedToken = oauthHandler.tokenCache.get(userId);
            expect(cachedToken.accessToken).toBe('new_access_token');
        });
        
        it('should handle refresh token errors', async () => {
            const userId = 'test_user_123';
            
            oauthHandler.tokenCache.set(userId, {
                accessToken: 'old_access_token',
                refreshToken: 'invalid_refresh_token',
                expiresAt: Date.now() - 1000
            });
            
            oauthHandler.makeTokenRequest = vi.fn().mockRejectedValue(
                new Error('Invalid refresh token')
            );
            
            await expect(oauthHandler.refreshToken(userId)).rejects.toThrow('Invalid refresh token');
            expect(oauthHandler.tokenCache.has(userId)).toBe(false);
        });
    });
    
    describe('Utility Functions', () => {
        it('should create verification token', () => {
            const identityResult = TestDataFactory.createIdentityResult();
            
            const token = oauthHandler.createVerificationToken(identityResult);
            
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBeGreaterThan(0);
            
            // Should be valid base64
            expect(() => atob(token)).not.toThrow();
        });
        
        it('should generate state token', () => {
            const userId = 'test_user_123';
            const identityResult = TestDataFactory.createIdentityResult();
            
            const state = oauthHandler.generateStateToken(userId, identityResult);
            
            expect(state).toBeDefined();
            expect(typeof state).toBe('string');
            expect(state).toContain('.'); // Should have signature
            expect(state.length).toBeGreaterThan(20);
        });
        
        it('should build authorization URL correctly', () => {
            const verificationToken = 'ver_token_123';
            const state = 'state_123.signature';
            
            const url = oauthHandler.buildAuthUrl(verificationToken, state);
            
            expect(url).toContain('cash.app/oauth/authorize');
            expect(url).toContain('response_type=code');
            expect(url).toContain('client_id=' + config.clientId);
            expect(url).toContain('redirect_uri=' + encodeURIComponent(config.redirectUri));
            expect(url).toContain('scope=' + encodeURIComponent(config.scope));
            expect(url).toContain('state=' + state);
            expect(url).toContain('verification_token=' + verificationToken);
        });
        
        it('should mask PII correctly', () => {
            expect(oauthHandler.maskPII('user_123456')).toBe('us****56');
            expect(oauthHandler.maskPII('short')).toBe('****');
            expect(oauthHandler.maskPII('')).toBe('undefined');
            expect(oauthHandler.maskPII(null)).toBe('undefined');
        });
        
        it('should generate random IDs', () => {
            const id1 = oauthHandler.generateId();
            const id2 = oauthHandler.generateId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1.length).toBe(32); // 16 bytes * 2 hex chars
        });
    });
    
    describe('Token Exchange', () => {
        it('should exchange code for tokens successfully', async () => {
            const code = 'auth_code_123';
            
            TestUtils.mockFetchResponse({
                access_token: 'access_token_123',
                refresh_token: 'refresh_token_123',
                expires_in: 3600,
                scope: 'wallet:read wallet:write'
            });
            
            const result = await oauthHandler.exchangeCodeForTokens(code);
            
            expect(result.access_token).toBe('access_token_123');
            expect(result.refresh_token).toBe('refresh_token_123');
            expect(result.expires_in).toBe(3600);
            expect(result.scope).toBe('wallet:read wallet:write');
            
            expect(global.fetch).toHaveBeenCalledWith(
                'https://cash.app/oauth/token',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': expect.stringContaining('Basic ')
                    })
                })
            );
        });
        
        it('should handle token request errors', async () => {
            const code = 'invalid_code';
            
            TestUtils.mockFetchResponse(
                { error: 'invalid_grant' },
                { status: 400, statusText: 'Bad Request' }
            );
            
            await expect(oauthHandler.exchangeCodeForTokens(code)).rejects.toThrow('Token request failed: 400 Bad Request');
        });
        
        it('should make token request with correct parameters', async () => {
            const code = 'auth_code_123';
            
            TestUtils.mockFetchResponse({
                access_token: 'access_token_123',
                expires_in: 3600
            });
            
            await oauthHandler.exchangeCodeForTokens(code);
            
            const fetchCall = global.fetch.mock.calls[0];
            const body = fetchCall[1].body;
            
            expect(body).toContain('grant_type=authorization_code');
            expect(body).toContain('code=' + code);
            expect(body).toContain('redirect_uri=' + encodeURIComponent(config.redirectUri));
        });
    });
    
    describe('Metrics', () => {
        it('should track metrics correctly', async () => {
            const userData = TestDataFactory.createUserData();
            const identityResult = TestDataFactory.createIdentityResult();
            
            // Reset metrics
            oauthHandler.metrics = {
                totalFlows: 0,
                successfulAuths: 0,
                failedAuths: 0,
                averageFlowTime: 0
            };
            
            await oauthHandler.initiateCashAppFlow(userData, identityResult);
            
            const metrics = oauthHandler.getMetrics();
            expect(metrics.totalFlows).toBe(1);
            expect(metrics.successfulAuths).toBe(1);
            expect(metrics.failedAuths).toBe(0);
            expect(metrics.successRate).toBe(100);
            expect(metrics.averageFlowTime).toBeGreaterThan(0);
        });
        
        it('should calculate success rate correctly', () => {
            oauthHandler.metrics.totalFlows = 10;
            oauthHandler.metrics.successfulAuths = 7;
            
            const metrics = oauthHandler.getMetrics();
            expect(metrics.successRate).toBe(70);
        });
        
        it('should handle zero flows gracefully', () => {
            oauthHandler.metrics.totalFlows = 0;
            oauthHandler.metrics.successfulAuths = 0;
            
            const metrics = oauthHandler.getMetrics();
            expect(metrics.successRate).toBe(0);
        });
    });
    
    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const health = await oauthHandler.healthCheck();
            
            expect(health.status).toBe('healthy');
            expect(health.initialized).toBe(true);
            expect(health.metrics).toBeDefined();
            expect(health.config).toBeDefined();
        });
        
        it('should return unhealthy status on error', async () => {
            oauthHandler.validateConfig = vi.fn().mockImplementation(() => {
                throw new Error('Configuration error');
            });
            
            const health = await oauthHandler.healthCheck();
            
            expect(health.status).toBe('unhealthy');
            expect(health.error).toBe('Configuration error');
        });
        
        it('should include configuration summary', async () => {
            const health = await oauthHandler.healthCheck();
            
            expect(health.config.hasClientId).toBe(true);
            expect(health.config.hasClientSecret).toBe(true);
            expect(health.config.redirectUri).toBe(config.redirectUri);
        });
    });
    
    describe('Cleanup', () => {
        it('should cleanup expired data', async () => {
            // Add expired state
            oauthHandler.stateStore.set('expired_state', {
                userId: 'user1',
                timestamp: Date.now() - (config.stateExpiry * 1000 + 1000)
            });
            
            // Add expired token
            oauthHandler.tokenCache.set('user1', {
                accessToken: 'token1',
                expiresAt: Date.now() - 1000
            });
            
            await oauthHandler.cleanupExpired();
            
            expect(oauthHandler.stateStore.has('expired_state')).toBe(false);
            expect(oauthHandler.tokenCache.has('user1')).toBe(false);
        });
        
        it('should shutdown gracefully', async () => {
            oauthHandler.tokenCache.set('user1', { accessToken: 'token1' });
            oauthHandler.stateStore.set('state1', { userId: 'user1' });
            
            await oauthHandler.shutdown();
            
            expect(oauthHandler.tokenCache.size).toBe(0);
            expect(oauthHandler.stateStore.size).toBe(0);
            expect(oauthHandler.initialized).toBe(false);
        });
    });
});
