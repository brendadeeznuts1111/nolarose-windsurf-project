#!/usr/bin/env bun

// __tests__/cash-app-adapter.test.js - Main Adapter Test Suite
// 100% coverage tests for the core Cash App adapter

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { CashAppVerificationAdapter, createCashAppAdapter } from '../cash-app-adapter.js';
import { TestDataFactory, createMockGDPRValidator, TestUtils } from './setup.js';

console.log("🧪 Cash App Adapter Test Suite - Loaded");

describe('CashAppVerificationAdapter v3.0', () => {
    let adapter;
    let mockGDPRValidator;
    let config;
    
    beforeEach(async () => {
        TestUtils.setupTestEnvironment();
        
        config = TestDataFactory.createConfig();
        mockGDPRValidator = createMockGDPRValidator();
        
        adapter = new CashAppVerificationAdapter(mockGDPRValidator, config);
        await adapter.init();
    });
    
    afterEach(async () => {
        if (adapter) {
            await adapter.shutdown();
        }
        TestUtils.cleanupTestEnvironment();
    });
    
    describe('Adapter Initialization', () => {
        it('should initialize adapter with all modules', () => {
            expect(adapter).toBeDefined();
            expect(adapter.oauth).toBeDefined();
            expect(adapter.plaid).toBeDefined();
            expect(adapter.validation).toBeDefined();
            expect(adapter.router).toBeDefined();
            expect(adapter.initialized).toBe(true);
        });
        
        it('should load configuration successfully', () => {
            expect(adapter.config).toBeDefined();
            expect(adapter.config.cashApp).toBeDefined();
            expect(adapter.config.plaid).toBeDefined();
            expect(adapter.config.verifier).toBeDefined();
        });
        
        it('should initialize modules within acceptable time', () => {
            expect(adapter.metrics.moduleLoadTime).toBeLessThan(50); // 50ms threshold
        });
        
        it('should emit initialization event', () => {
            expect(mockGDPRValidator.eventBus.emit).toHaveBeenCalledWith('adapter:initialized', expect.objectContaining({
                loadTime: expect.any(Number),
                modules: ['oauth', 'plaid', 'validation', 'router']
            }));
        });
        
        it('should handle initialization errors gracefully', async () => {
            const invalidConfig = TestDataFactory.createConfig({
                verifier: { fuzzyThreshold: 2 } // Invalid (> 1)
            });
            
            const invalidAdapter = new CashAppVerificationAdapter(mockGDPRValidator, invalidConfig);
            
            await expect(invalidAdapter.init()).rejects.toThrow();
        });
        
        it('should not initialize twice', async () => {
            const initSpy = vi.spyOn(adapter.oauth, 'init');
            
            await adapter.init(); // Second initialization
            
            expect(initSpy).toHaveBeenCalledTimes(0); // Should not be called again
        });
    });
    
    describe('verifyWalletFunding', () => {
        it('should handle complete verification flow successfully', async () => {
            const userData = TestDataFactory.createUserData();
            
            // Mock successful responses
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            adapter.oauth.initiateCashAppFlow = vi.fn().mockResolvedValue(
                TestDataFactory.createOAuthResult()
            );
            
            adapter.plaid.verifyBankAccount = vi.fn().mockResolvedValue(
                TestDataFactory.createPlaidResult()
            );
            
            adapter.validation.crossValidateAll = vi.fn().mockReturnValue({
                success: true,
                verificationId: 'ver_123',
                userId: userData.userId,
                confidence: 90,
                riskScore: 15,
                validationPassed: true
            });
            
            adapter.router.routeToTier = vi.fn().mockResolvedValue({
                finalTier: 'FAST',
                automated: true,
                requiresManualReview: false
            });
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(true);
            expect(result.userId).toBe('te****23');
            expect(result.tier).toBe('FAST');
            expect(result.confidence).toBe(90);
            expect(result.modules).toBeDefined();
            expect(result.responseTime).toBeDefined();
        });
        
        it('should reject on pre-screen failure', async () => {
            const userData = TestDataFactory.createUserData({
                email: 'invalid-email'
            });
            
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: false,
                score: 40,
                issues: ['Invalid email format']
            });
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('PRE_SCREEN_FAILED');
        });
        
        it('should handle high risk rejection', async () => {
            const userData = TestDataFactory.createUserData();
            
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            adapter.router.applyAdaptiveStrategy = vi.fn().mockReturnValue({
                tier: 'REJECT',
                requiresCashAppVerification: false,
                requiresPlaidVerification: false,
                confidence: 20,
                riskScore: 85
            });
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('HIGH_RISK');
        });
        
        it('should handle verification errors gracefully', async () => {
            const userData = TestDataFactory.createUserData();
            
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            adapter.oauth.initiateCashAppFlow = vi.fn().mockRejectedValue(
                new Error('OAuth service unavailable')
            );
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('OAuth service unavailable');
        });
        
        it('should update metrics on successful verification', async () => {
            const userData = TestDataFactory.createUserData();
            
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            adapter.oauth.initiateCashAppFlow = vi.fn().mockResolvedValue(
                TestDataFactory.createOAuthResult()
            );
            
            adapter.plaid.verifyBankAccount = vi.fn().mockResolvedValue(
                TestDataFactory.createPlaidResult()
            );
            
            adapter.validation.crossValidateAll = vi.fn().mockReturnValue({
                success: true,
                verificationId: 'ver_123',
                userId: userData.userId,
                confidence: 90,
                riskScore: 15,
                validationPassed: true
            });
            
            adapter.router.routeToTier = vi.fn().mockResolvedValue({
                finalTier: 'FAST',
                automated: true,
                requiresManualReview: false
            });
            
            await adapter.verifyWalletFunding(userData);
            
            const metrics = adapter.getMetrics();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.successfulVerifications).toBe(1);
            expect(metrics.averageResponseTime).toBeGreaterThan(0);
        });
        
        it('should handle concurrent verification requests', async () => {
            const userData1 = TestDataFactory.createUserData({ userId: 'user1' });
            const userData2 = TestDataFactory.createUserData({ userId: 'user2' });
            
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            adapter.oauth.initiateCashAppFlow = vi.fn().mockResolvedValue(
                TestDataFactory.createOAuthResult()
            );
            
            adapter.plaid.verifyBankAccount = vi.fn().mockResolvedValue(
                TestDataFactory.createPlaidResult()
            );
            
            adapter.validation.crossValidateAll = vi.fn().mockReturnValue({
                success: true,
                verificationId: 'ver_123',
                confidence: 90,
                riskScore: 15,
                validationPassed: true
            });
            
            adapter.router.routeToTier = vi.fn().mockResolvedValue({
                finalTier: 'FAST',
                automated: true,
                requiresManualReview: false
            });
            
            const [result1, result2] = await Promise.all([
                adapter.verifyWalletFunding(userData1),
                adapter.verifyWalletFunding(userData2)
            ]);
            
            expect(result1.success).toBe(true);
            expect(result2.success).toBe(true);
            expect(result1.userId).not.toBe(result2.userId);
        });
    });
    
    describe('handleCashAppCallback', () => {
        it('should handle OAuth callback successfully', async () => {
            const code = 'auth_code_123';
            const state = 'state_123';
            
            adapter.oauth.handleCashAppCallback = vi.fn().mockResolvedValue({
                success: true,
                userId: 'te****23',
                accessToken: 'acc_123',
                scope: 'wallet:read'
            });
            
            const result = await adapter.handleCashAppCallback(code, state);
            
            expect(result.success).toBe(true);
            expect(adapter.oauth.handleCashAppCallback).toHaveBeenCalledWith(code, state);
        });
        
        it('should handle callback errors', async () => {
            const code = 'invalid_code';
            const state = 'invalid_state';
            
            adapter.oauth.handleCashAppCallback = vi.fn().mockRejectedValue(
                new Error('Invalid authorization code')
            );
            
            const result = await adapter.handleCashAppCallback(code, state);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Invalid authorization code');
        });
    });
    
    describe('getVerificationStatus', () => {
        it('should return verification status for valid ID', async () => {
            const verificationId = 'ver_123';
            
            adapter.validation.getVerificationStatus = vi.fn().mockResolvedValue({
                found: true,
                verification: {
                    verificationId,
                    userId: 'te****23',
                    passed: true,
                    confidence: 90,
                    riskScore: 15,
                    timestamp: Date.now()
                }
            });
            
            const result = await adapter.getVerificationStatus(verificationId);
            
            expect(result.found).toBe(true);
            expect(result.verification.verificationId).toBe(verificationId);
        });
        
        it('should return not found for invalid ID', async () => {
            const verificationId = 'invalid_ver';
            
            adapter.validation.getVerificationStatus = vi.fn().mockResolvedValue({
                found: false,
                error: 'Verification not found'
            });
            
            const result = await adapter.getVerificationStatus(verificationId);
            
            expect(result.found).toBe(false);
            expect(result.error).toBe('Verification not found');
        });
    });
    
    describe('Metrics and Monitoring', () => {
        it('should track metrics correctly', async () => {
            const userData = TestDataFactory.createUserData();
            
            adapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            adapter.oauth.initiateCashAppFlow = vi.fn().mockResolvedValue(
                TestDataFactory.createOAuthResult()
            );
            
            adapter.plaid.verifyBankAccount = vi.fn().mockResolvedValue(
                TestDataFactory.createPlaidResult()
            );
            
            adapter.validation.crossValidateAll = vi.fn().mockReturnValue({
                success: true,
                verificationId: 'ver_123',
                confidence: 90,
                riskScore: 15,
                validationPassed: true
            });
            
            adapter.router.routeToTier = vi.fn().mockResolvedValue({
                finalTier: 'FAST',
                automated: true,
                requiresManualReview: false
            });
            
            // Reset metrics
            adapter.metrics = {
                totalRequests: 0,
                successfulVerifications: 0,
                averageResponseTime: 0,
                moduleLoadTime: adapter.metrics.moduleLoadTime
            };
            
            await adapter.verifyWalletFunding(userData);
            
            const metrics = adapter.getMetrics();
            expect(metrics.totalRequests).toBe(1);
            expect(metrics.successfulVerifications).toBe(1);
            expect(metrics.successRate).toBe(100);
            expect(metrics.averageResponseTime).toBeGreaterThan(0);
        });
        
        it('should calculate success rate correctly', () => {
            adapter.metrics.totalRequests = 10;
            adapter.metrics.successfulVerifications = 8;
            
            const metrics = adapter.getMetrics();
            expect(metrics.successRate).toBe(80);
        });
        
        it('should handle zero requests gracefully', () => {
            adapter.metrics.totalRequests = 0;
            adapter.metrics.successfulVerifications = 0;
            
            const metrics = adapter.getMetrics();
            expect(metrics.successRate).toBe(0);
        });
    });
    
    describe('Health Check', () => {
        it('should return healthy status for all modules', async () => {
            adapter.oauth.healthCheck = vi.fn().mockResolvedValue({
                status: 'healthy',
                initialized: true
            });
            
            adapter.plaid.healthCheck = vi.fn().mockResolvedValue({
                status: 'healthy',
                initialized: true
            });
            
            adapter.validation.healthCheck = vi.fn().mockResolvedValue({
                status: 'healthy',
                initialized: true
            });
            
            adapter.router.healthCheck = vi.fn().mockResolvedValue({
                status: 'healthy',
                initialized: true
            });
            
            const health = await adapter.healthCheck();
            
            expect(health.adapter).toBe('healthy');
            expect(health.modules.oauth.status).toBe('healthy');
            expect(health.modules.plaid.status).toBe('healthy');
            expect(health.modules.validation.status).toBe('healthy');
            expect(health.modules.router.status).toBe('healthy');
        });
        
        it('should handle unhealthy modules', async () => {
            adapter.oauth.healthCheck = vi.fn().mockResolvedValue({
                status: 'unhealthy',
                error: 'Connection failed'
            });
            
            const health = await adapter.healthCheck();
            
            expect(health.modules.oauth.status).toBe('unhealthy');
            expect(health.modules.oauth.error).toBe('Connection failed');
        });
        
        it('should include uptime and memory information', async () => {
            adapter.oauth.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            adapter.plaid.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            adapter.validation.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            adapter.router.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            
            const health = await adapter.healthCheck();
            
            expect(health.uptime).toBeGreaterThan(0);
            expect(health.memory).toBeDefined();
            expect(health.metrics).toBeDefined();
        });
    });
    
    describe('Shutdown', () => {
        it('should shutdown all modules gracefully', async () => {
            const oauthShutdownSpy = vi.spyOn(adapter.oauth, 'shutdown');
            const plaidShutdownSpy = vi.spyOn(adapter.plaid, 'shutdown');
            const validationShutdownSpy = vi.spyOn(adapter.validation, 'shutdown');
            const routerShutdownSpy = vi.spyOn(adapter.router, 'shutdown');
            
            await adapter.shutdown();
            
            expect(oauthShutdownSpy).toHaveBeenCalled();
            expect(plaidShutdownSpy).toHaveBeenCalled();
            expect(validationShutdownSpy).toHaveBeenCalled();
            expect(routerShutdownSpy).toHaveBeenCalled();
            
            expect(adapter.tokenCache.size).toBe(0);
            expect(adapter.sessionStore.size).toBe(0);
            expect(adapter.initialized).toBe(false);
        });
    });
    
    describe('Utility Functions', () => {
        it('should mask PII correctly', () => {
            expect(adapter.maskPII('user_123456')).toBe('us****56');
            expect(adapter.maskPII('short')).toBe('****');
            expect(adapter.maskPII('')).toBe('undefined');
            expect(adapter.maskPII(null)).toBe('undefined');
            expect(adapter.maskPII(undefined)).toBe('undefined');
        });
        
        it('should ensure initialization before operations', async () => {
            const newAdapter = new CashAppVerificationAdapter(mockGDPRValidator, config);
            
            expect(newAdapter.initialized).toBe(false);
            
            const userData = TestDataFactory.createUserData();
            newAdapter.validation.preScreenUser = vi.fn().mockResolvedValue({
                passed: true,
                score: 100,
                issues: []
            });
            
            await newAdapter.verifyWalletFunding(userData);
            
            expect(newAdapter.initialized).toBe(true);
        });
    });
});

describe('createCashAppAdapter Factory', () => {
    it('should create and initialize adapter', async () => {
        const mockGDPRValidator = createMockGDPRValidator();
        const config = TestDataFactory.createConfig();
        
        const adapter = await createCashAppAdapter(mockGDPRValidator, config);
        
        expect(adapter).toBeInstanceOf(CashAppVerificationAdapter);
        expect(adapter.initialized).toBe(true);
    });
    
    it('should handle initialization errors', async () => {
        const mockGDPRValidator = createMockGDPRValidator();
        const invalidConfig = TestDataFactory.createConfig({
            verifier: { fuzzyThreshold: 2 }
        });
        
        await expect(createCashAppAdapter(mockGDPRValidator, invalidConfig))
            .rejects.toThrow();
    });
});
