#!/usr/bin/env bun

// __tests__/simple-adapter.test.js - Simple Adapter Test Suite
// Basic tests without complex configuration loading

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { CashAppVerificationAdapter } from '../cash-app-adapter.js';

console.log("🧪 Simple Adapter Test Suite - Loaded");

describe('CashAppVerificationAdapter - Basic Tests', () => {
    let adapter;
    let mockGDPRValidator;
    
    beforeEach(() => {
        // Create simple mock GDPR validator
        mockGDPRValidator = {
            gdprModule: { enabled: true },
            eventBus: {
                emit: vi.fn(),
                on: vi.fn(),
                off: vi.fn()
            },
            validateIdentity: vi.fn().mockResolvedValue({
                success: true,
                userId: 'test_user_123',
                verificationId: 'ver_123',
                confidence: 85,
                riskScore: 25,
                documents: { verified: true },
                email: { verified: true },
                phone: { verified: true }
            })
        };
        
        // Create adapter with simple config (no TOML loading)
        const simpleConfig = {
            cashApp: {
                clientId: 'test_client_id',
                clientSecret: 'test_client_secret',
                redirectUri: 'http://localhost:3000/callback',
                scope: 'wallet:read wallet:write',
                tokenExpiry: 3600,
                stateExpiry: 600
            },
            plaid: {
                clientId: 'test_client_id',
                secret: 'test_secret',
                env: 'sandbox',
                products: ['auth', 'transactions'],
                countryCodes: ['US'],
                language: 'en',
                webhook: null,
                cacheExpiry: 1800
            },
            verifier: {
                fuzzyThreshold: 0.8,
                phoneMatchThreshold: 0.9,
                emailMatchThreshold: 0.85,
                nameMatchThreshold: 0.75,
                verificationExpiry: 86400000,
                maxRetries: 3,
                enableAdaptiveRouting: true,
                conflictDetection: true,
                manualReviewThreshold: 70,
                queueHighRisk: true,
                escalationThreshold: 85,
                maxResponseTime: 5000,
                maxQueueSize: 1000,
                retryAttempts: 3
            },
            logging: {
                level: 'info',
                enableMetrics: true,
                enableTracing: true,
                maskPII: true,
                logToFile: false,
                logDirectory: './logs'
            },
            performance: {
                enableCaching: true,
                cacheSize: 1000,
                cacheTTL: 3600000,
                enableCompression: true,
                enableMetrics: true,
                metricsInterval: 60000
            }
        };
        
        adapter = new CashAppVerificationAdapter(mockGDPRValidator, simpleConfig);
    });
    
    afterEach(async () => {
        if (adapter) {
            await adapter.shutdown();
        }
    });
    
    it('should create adapter instance', () => {
        expect(adapter).toBeDefined();
        expect(adapter.validator).toBe(mockGDPRValidator);
        expect(adapter.config).toBeDefined();
    });
    
    it('should mask PII correctly', () => {
        expect(adapter.maskPII('user_123456')).toBe('us****56');
        expect(adapter.maskPII('short')).toBe('sh****rt');
        expect(adapter.maskPII('')).toBe('undefined');
        expect(adapter.maskPII(null)).toBe('undefined');
    });
    
    it('should initialize without errors', async () => {
        await adapter.init();
        expect(adapter.initialized).toBe(true);
        expect(adapter.oauth).toBeDefined();
        expect(adapter.plaid).toBeDefined();
        expect(adapter.validation).toBeDefined();
        expect(adapter.router).toBeDefined();
    });
    
    it('should handle shutdown gracefully', async () => {
        await adapter.init();
        await adapter.shutdown();
        expect(adapter.initialized).toBe(false);
        expect(adapter.tokenCache.size).toBe(0);
        expect(adapter.sessionStore.size).toBe(0);
    });
    
    it('should track metrics correctly', async () => {
        await adapter.init();
        
        const metrics = adapter.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.totalRequests).toBe(0);
        expect(metrics.successfulVerifications).toBe(0);
        expect(metrics.averageResponseTime).toBe(0);
        expect(metrics.successRate).toBe(0);
    });
    
    it('should emit initialization event', async () => {
        await adapter.init();
        
        expect(mockGDPRValidator.eventBus.emit).toHaveBeenCalledWith('adapter:initialized', expect.objectContaining({
            loadTime: expect.any(Number),
            modules: ['oauth', 'plaid', 'validation', 'router']
        }));
    });
    
    it('should handle health check', async () => {
        await adapter.init();
        
        const health = await adapter.healthCheck();
        expect(health).toBeDefined();
        expect(health.adapter).toBe('healthy');
        expect(health.uptime).toBeGreaterThan(0);
        expect(health.memory).toBeDefined();
        expect(health.metrics).toBeDefined();
    });
});
