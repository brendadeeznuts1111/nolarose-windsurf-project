#!/usr/bin/env bun

// __tests__/enhanced-adapter.test.js - Enhanced GDPR Adapter Test Suite
// Comprehensive tests for GDPR compliance and OnePay integration

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { EnhancedCashAppAdapter, onePayGDPRConfig, ConsentManager, FraudRingDetector } from '../enhanced-cash-app-adapter.js';
import { TestDataFactory, createMockGDPRValidator, TestUtils } from './setup.js';

console.log("🛡️ Enhanced GDPR Adapter Test Suite - Loaded");

describe('EnhancedCashAppAdapter - GDPR Compliance', () => {
    let adapter;
    let mockGDPRValidator;
    
    beforeEach(async () => {
        TestUtils.setupTestEnvironment();
        
        // Create enhanced mock GDPR validator
        mockGDPRValidator = {
            gdprModule: { 
                enabled: true,
                pseudonymize: vi.fn((id, type) => `pseudo_${id}_${type}`),
                createHash: vi.fn((data, salt) => `hash_${data}_${salt}`),
                scheduleAutoDelete: vi.fn()
            },
            eventBus: {
                emit: vi.fn(),
                on: vi.fn(),
                off: vi.fn()
            },
            validateIdentity: vi.fn().mockResolvedValue(
                TestDataFactory.createIdentityResult()
            ),
            userLocation: 'US'
        };
        
        // Create enhanced adapter with GDPR config
        adapter = new EnhancedCashAppAdapter(mockGDPRValidator, onePayGDPRConfig);
        await adapter.init();
    });
    
    afterEach(async () => {
        if (adapter) {
            await adapter.shutdown();
        }
        TestUtils.cleanupTestEnvironment();
    });

    describe('GDPR Compliance', () => {
        it('should initialize with GDPR configuration', () => {
            expect(adapter).toBeDefined();
            expect(adapter.onePayConfig).toBeDefined();
            expect(adapter.onePayConfig.lawfulBasis).toBeDefined();
            expect(adapter.consentManager).toBeDefined();
            expect(adapter.fraudDetector).toBeDefined();
            expect(adapter.processingRecords).toBeDefined();
        });

        it('should determine lawful basis correctly for US users', () => {
            const userData = TestDataFactory.createUserData({ location: 'US' });
            const basis = adapter.determineLawfulBasis(userData);
            expect(basis).toBe('LEGITIMATE_INTEREST');
        });

        it('should determine lawful basis correctly for EU users', () => {
            const userData = TestDataFactory.createUserData({ location: 'EU' });
            const basis = adapter.determineLawfulBasis(userData);
            expect(basis).toBe('CONSENT');
        });

        it('should classify OnePay data categories correctly', () => {
            const userData = TestDataFactory.createUserData({
                cashAppLinked: true,
                bankLinked: true,
                rewardsOptIn: true
            });
            
            const categories = adapter.classifyOnePayData(userData);
            expect(categories).toContain('IDENTITY_DOCUMENT');
            expect(categories).toContain('CONTACT_INFORMATION');
            expect(categories).toContain('FINANCIAL_DATA');
            expect(categories).toContain('BANK_ACCOUNT_DATA');
            expect(categories).toContain('BEHAVIORAL_DATA');
        });

        it('should apply progressive disclosure for EU users', async () => {
            const userData = TestDataFactory.createUserData({ location: 'EU' });
            
            const disclosure = await adapter.applyProgressiveDisclosure(userData);
            expect(disclosure.continue).toBe(false);
            expect(disclosure.reason).toBe('CONSENT_REQUIRED');
            expect(disclosure.location).toBe('EU');
            expect(disclosure.consentText).toContain('GDPR Consent Required');
        });

        it('should allow processing for US users without consent', async () => {
            const userData = TestDataFactory.createUserData({ location: 'US' });
            
            const disclosure = await adapter.applyProgressiveDisclosure(userData);
            expect(disclosure.continue).toBe(true);
        });

        it('should generate processing records with GDPR metadata', async () => {
            const userData = TestDataFactory.createUserData({ location: 'US' });
            const result = TestDataFactory.createIdentityResult();
            
            const record = await adapter.generateProcessingRecord(userData, result);
            
            expect(record.recordId).toMatch(/^onepay-/);
            expect(record.processingActivity).toBe('ONEPAY_WALLET_SIGNUP');
            expect(record.lawfulBasis).toBe('LEGITIMATE_INTEREST');
            expect(record.pseudonymizationApplied).toBe(true);
            expect(record.geographicLocation).toBe('US');
        });

        it('should schedule auto-deletion for successful verifications', async () => {
            const userData = TestDataFactory.createUserData();
            
            adapter.scheduleAutoDeletion(userData);
            
            expect(mockGDPRValidator.gdprModule.scheduleAutoDelete).toHaveBeenCalledWith(
                ['doc-input', 'phone-input', 'cashapp-token'],
                onePayGDPRConfig.autoDeletion.delayMs
            );
        });
    });

    describe('Enhanced Verification Flow', () => {
        it('should handle US user verification without consent', async () => {
            const userData = TestDataFactory.createUserData({ location: 'US' });
            
            // Mock successful verification
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
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(true);
            expect(result.gdprCompliant).toBe(true);
            expect(result.lawfulBasis).toBe('LEGITIMATE_INTEREST');
            expect(result.consentRequired).toBe(false);
            expect(result.onePayIntegrated).toBe(true);
            expect(result.approvalRate).toBe(95);
        });

        it('should require consent for EU users', async () => {
            const userData = TestDataFactory.createUserData({ location: 'EU' });
            
            // Mock consent denial
            adapter.consentManager.requestConsent = vi.fn().mockResolvedValue(false);
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('CONSENT_REQUIRED');
            expect(result.gdprCompliant).toBe(true);
            expect(result.consentRequired).toBe(true);
            expect(result.lawfulBasis).toBe('CONSENT');
        });

        it('should handle enhanced pre-screening with fraud detection', async () => {
            const userData = TestDataFactory.createUserData();
            
            // Mock fraud detection
            adapter.fraudDetector.detectFraudRing = vi.fn().mockResolvedValue({
                detected: true,
                confidence: 0.8,
                apps: 5
            });
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('FRAUD_RING_DETECTED');
        });

        it('should handle velocity limits for EU users', async () => {
            const userData = TestDataFactory.createUserData({ location: 'EU' });
            
            // Mock velocity limit exceeded
            adapter.getRecentAttempts = vi.fn().mockResolvedValue({
                deviceCount: 2,
                hourlyCount: 3
            });
            
            const result = await adapter.verifyWalletFunding(userData);
            
            expect(result.success).toBe(false);
            expect(result.reason).toBe('HOURLY_LIMIT_EXCEEDED');
        });

        it('should enhance verification results with GDPR metadata', async () => {
            const userData = TestDataFactory.createUserData({ location: 'US' });
            const baseResult = {
                success: true,
                tier: 'FAST',
                confidence: 90,
                userId: userData.userId
            };
            const processingRecord = {
                recordId: 'test-record',
                processingActivity: 'ONEPAY_WALLET_SIGNUP'
            };
            
            const enhanced = adapter.enhanceResult(baseResult, 'LEGITIMATE_INTEREST', processingRecord);
            
            expect(enhanced.gdprCompliant).toBe(true);
            expect(enhanced.lawfulBasis).toBe('LEGITIMATE_INTEREST');
            expect(enhanced.processingRecord).toBe(processingRecord);
            expect(enhanced.autoDeletionScheduled).toBe(true);
            expect(enhanced.dataPortabilityAvailable).toBe(true);
            expect(enhanced.onePayIntegrated).toBe(true);
            expect(enhanced.approvalRate).toBe(95);
        });
    });

    describe('Data Portability (Article 20)', () => {
        it('should export user data in GDPR-compliant format', async () => {
            const userId = 'test_user_123';
            
            const exportData = await adapter.exportUserData(userId);
            
            expect(exportData.format).toBe('JSON');
            expect(exportData.data).toBeDefined();
            expect(exportData.size).toBeGreaterThan(0);
            expect(exportData.checksum).toBeDefined();
            
            expect(exportData.data.userId).toBe('pseudo_test_user_123_user');
            expect(exportData.data.gdprMetadata).toBeDefined();
            expect(exportData.data.gdprMetadata.exportDate).toBeDefined();
            expect(exportData.data.gdprMetadata.lawfulBasis).toBeDefined();
        });

        it('should include all required data categories in export', async () => {
            const userId = 'test_user_123';
            
            const exportData = await adapter.exportUserData(userId);
            
            expect(exportData.data.verificationHistory).toBeDefined();
            expect(exportData.data.rewardsHistory).toBeDefined();
            expect(exportData.data.processingRecords).toBeDefined();
            expect(exportData.data.gdprMetadata.dataCategories).toBeDefined();
        });
    });

    describe('Right to Object (Article 21)', () => {
        it('should handle marketing objections', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'marketing');
            
            expect(result.success).toBe(true);
            expect(result.objectionType).toBe('marketing');
        });

        it('should handle automated decision objections', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'automated_decisions');
            
            expect(result.success).toBe(true);
            expect(result.objectionType).toBe('automated_decisions');
        });

        it('should handle Cash App linking objections', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'cashapp_linking');
            
            expect(result.success).toBe(true);
            expect(result.objectionType).toBe('cashapp_linking');
        });

        it('should handle rewards objections', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'rewards');
            
            expect(result.success).toBe(true);
            expect(result.objectionType).toBe('rewards');
        });

        it('should reject unknown objection types', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'unknown');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown objection type');
        });
    });

    describe('Enhanced Metrics', () => {
        it('should include GDPR metrics in enhanced metrics', () => {
            const metrics = adapter.getMetrics();
            
            expect(metrics.gdpr).toBeDefined();
            expect(metrics.gdpr.processingRecords).toBeDefined();
            expect(metrics.gdpr.consentRequests).toBeDefined();
            expect(metrics.gdpr.autoDeletions).toBeDefined();
            expect(metrics.gdpr.dataExports).toBeDefined();
            
            expect(metrics.onePay).toBeDefined();
            expect(metrics.onePay.approvalRate).toBeDefined();
            expect(metrics.onePay.averageVerificationTime).toBeDefined();
            expect(metrics.onePay.fraudDetections).toBeDefined();
        });
    });

    describe('Enhanced Health Check', () => {
        it('should include GDPR compliance status in health check', async () => {
            adapter.oauth.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            adapter.plaid.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            adapter.validation.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            adapter.router.healthCheck = vi.fn().mockResolvedValue({ status: 'healthy' });
            
            const health = await adapter.healthCheck();
            
            expect(health.gdpr).toBeDefined();
            expect(health.gdpr.compliant).toBe(true);
            expect(health.gdpr.lastDPIAReview).toBeDefined();
            expect(health.gdpr.consentManager).toBe('healthy');
            expect(health.gdpr.processingRecords).toBe('active');
            expect(health.gdpr.autoDeletion).toBe('enabled');
            
            expect(health.onePay).toBeDefined();
            expect(health.onePay.integrated).toBe(true);
            expect(health.onePay.approvalRate).toBe('95%');
            expect(health.onePay.fraudDetection).toBe('active');
            expect(health.onePay.consentFlow).toBe('operational');
        });
    });
});

describe('ConsentManager', () => {
    let consentManager;
    
    beforeEach(() => {
        consentManager = new ConsentManager();
    });

    it('should request consent for GDPR purposes', async () => {
        const userData = TestDataFactory.createUserData();
        
        const consent = await consentManager.requestConsent(userData, 'CASHAPP_LINKING');
        
        expect(consent).toBe(true);
        expect(consentManager.getConsentCount()).toBe(1);
    });

    it('should record consent with proper metadata', async () => {
        const userData = TestDataFactory.createUserData();
        
        const record = await consentManager.recordConsent(userData.userId, 'CASHAPP_LINKING', true);
        
        expect(record.userId).toBe(userData.userId);
        expect(record.purpose).toBe('CASHAPP_LINKING');
        expect(record.granted).toBe(true);
        expect(record.lawfulBasis).toBe('CONSENT');
        expect(record.revocable).toBe(true);
    });
});

describe('FraudRingDetector', () => {
    let fraudDetector;
    
    beforeEach(() => {
        fraudDetector = new FraudRingDetector();
    });

    it('should detect fraud rings with high tension', async () => {
        const userData = TestDataFactory.createUserData();
        
        // Mock high-tension applications
        fraudDetector.getRecentApplications = vi.fn().mockResolvedValue([
            { tension: 0.7, deviceId: userData.deviceFingerprint },
            { tension: 0.8, deviceId: userData.deviceFingerprint },
            { tension: 0.9, deviceId: userData.deviceFingerprint },
            { tension: 0.6, deviceId: userData.deviceFingerprint }
        ]);
        
        const result = await fraudDetector.detectFraudRing(userData);
        
        expect(result.detected).toBe(true);
        expect(result.confidence).toBe(0.8);
        expect(result.apps).toBe(4);
        expect(fraudDetector.getDetectionCount()).toBe(1);
    });

    it('should not detect fraud rings with low tension', async () => {
        const userData = TestDataFactory.createUserData();
        
        // Mock low-tension applications
        fraudDetector.getRecentApplications = vi.fn().mockResolvedValue([
            { tension: 0.2, deviceId: userData.deviceFingerprint },
            { tension: 0.3, deviceId: userData.deviceFingerprint }
        ]);
        
        const result = await fraudDetector.detectFraudRing(userData);
        
        expect(result.detected).toBe(false);
        expect(fraudDetector.getDetectionCount()).toBe(0);
    });
});

describe('OnePay Configuration Validation', () => {
    it('should have complete GDPR configuration structure', () => {
        expect(onePayGDPRConfig.lawfulBasis).toBeDefined();
        expect(onePayGDPRConfig.dataMinimization).toBeDefined();
        expect(onePayGDPRConfig.privacyByDesign).toBeDefined();
        expect(onePayGDPRConfig.geographic).toBeDefined();
        expect(onePayGDPRConfig.rewardsDPIA).toBeDefined();
        expect(onePayGDPRConfig.security).toBeDefined();
        expect(onePayGDPRConfig.autoDeletion).toBeDefined();
        expect(onePayGDPRConfig.processingRecords).toBeDefined();
        expect(onePayGDPRConfig.cashApp).toBeDefined();
        expect(onePayGDPRConfig.plaid).toBeDefined();
    });

    it('should have proper geographic configurations', () => {
        expect(onePayGDPRConfig.geographic.US).toBeDefined();
        expect(onePayGDPRConfig.geographic.EU).toBeDefined();
        expect(onePayGDPRConfig.geographic.CA).toBeDefined();
        
        expect(onePayGDPRConfig.geographic.EU.requiresConsent).toBe(true);
        expect(onePayGDPRConfig.geographic.US.requiresConsent).toBe(false);
        expect(onePayGDPRConfig.geographic.CA.requiresConsent).toBe(false);
    });

    it('should have complete DPIA documentation', () => {
        const dpia = onePayGDPRConfig.rewardsDPIA;
        
        expect(dpia.systematicMonitoring).toBe(true);
        expect(dpia.automatedDecisions).toBe(true);
        expect(dpia.largeScaleProcessing).toBe(true);
        expect(dpia.riskLevel).toBe('MEDIUM');
        expect(dpia.processingActivities).toBeDefined();
        expect(dpia.risks).toBeDefined();
        expect(dpia.mitigation).toBeDefined();
        expect(dpia.reviewSchedule).toBe('QUARTERLY');
        expect(dpia.nextReviewDate).toBeDefined();
    });

    it('should have proper security measures', () => {
        const security = onePayGDPRConfig.security;
        
        expect(security.encryption.algorithm).toBe('AES-256-GCM');
        expect(security.encryption.keyRotation).toBe('MONTHLY');
        expect(security.pseudonymization.algorithm).toBe('SHA-256');
        expect(security.pseudonymization.saltRotation).toBe('WEEKLY');
        expect(security.accessControl.principle).toBe('LEAST_PRIVILEGE');
        expect(security.incidentResponse.breachNotification).toBe(72);
    });
});
