#!/usr/bin/env bun

// __tests__/simple-enhanced-adapter.test.js - Simple Enhanced Adapter Test Suite
// Basic tests for GDPR compliance without complex configuration loading

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { EnhancedCashAppAdapter, onePayGDPRConfig, ConsentManager, FraudRingDetector } from '../enhanced-cash-app-adapter.js';

console.log("🛡️ Simple Enhanced GDPR Adapter Test Suite - Loaded");

describe('EnhancedCashAppAdapter - Basic GDPR Tests', () => {
    let adapter;
    let mockGDPRValidator;
    
    beforeEach(() => {
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
            validateIdentity: vi.fn().mockResolvedValue({
                success: true,
                userId: 'test_user_123',
                verificationId: 'ver_123',
                confidence: 85,
                riskScore: 25,
                documents: { verified: true },
                email: { verified: true },
                phone: { verified: true }
            }),
            userLocation: 'US'
        };
        
        // Create simple config for testing
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
                products: ['auth', 'identity'],
                countryCodes: ['US'],
                language: 'en'
            },
            verifier: {
                fuzzyThreshold: 0.8,
                phoneMatchThreshold: 0.9,
                emailMatchThreshold: 0.85,
                nameMatchThreshold: 0.75,
                verificationExpiry: 86400000,
                maxRetries: 3
            },
            logging: {
                level: 'info',
                enableMetrics: true,
                enableTracing: true,
                maskPII: true
            },
            performance: {
                enableCaching: true,
                cacheSize: 1000,
                cacheTTL: 3600000,
                enableMetrics: true
            }
        };
        
        // Create enhanced adapter with simple config + GDPR config
        const gdprEnhancedConfig = {
            ...simpleConfig,
            ...onePayGDPRConfig
        };
        
        adapter = new EnhancedCashAppAdapter(mockGDPRValidator, gdprEnhancedConfig);
    });
    
    afterEach(async () => {
        if (adapter) {
            await adapter.shutdown();
        }
    });

    describe('GDPR Configuration', () => {
        it('should initialize with GDPR configuration', () => {
            expect(adapter).toBeDefined();
            expect(adapter.onePayConfig).toBeDefined();
            expect(adapter.onePayConfig.lawfulBasis).toBeDefined();
            expect(adapter.consentManager).toBeDefined();
            expect(adapter.fraudDetector).toBeDefined();
        });

        it('should determine lawful basis correctly for US users', () => {
            const userData = {
                userId: 'test_user_123',
                location: 'US'
            };
            const basis = adapter.determineLawfulBasis(userData);
            expect(basis).toBe('LEGITIMATE_INTEREST');
        });

        it('should determine lawful basis correctly for EU users', () => {
            const userData = {
                userId: 'test_user_123',
                location: 'EU'
            };
            const basis = adapter.determineLawfulBasis(userData);
            expect(basis).toBe('CONSENT');
        });

        it('should classify OnePay data categories correctly', () => {
            const userData = {
                cashAppLinked: true,
                bankLinked: true,
                rewardsOptIn: true
            };
            
            const categories = adapter.classifyOnePayData(userData);
            expect(categories).toContain('IDENTITY_DOCUMENT');
            expect(categories).toContain('CONTACT_INFORMATION');
            expect(categories).toContain('FINANCIAL_DATA');
            expect(categories).toContain('BANK_ACCOUNT_DATA');
            expect(categories).toContain('BEHAVIORAL_DATA');
        });

        it('should apply progressive disclosure for EU users', async () => {
            const userData = {
                location: 'EU'
            };
            
            const disclosure = await adapter.applyProgressiveDisclosure(userData);
            expect(disclosure.continue).toBe(false);
            expect(disclosure.reason).toBe('CONSENT_REQUIRED');
            expect(disclosure.location).toBe('EU');
            expect(disclosure.consentText).toContain('GDPR Consent Required');
        });

        it('should allow processing for US users without consent', async () => {
            const userData = {
                location: 'US'
            };
            
            const disclosure = await adapter.applyProgressiveDisclosure(userData);
            expect(disclosure.continue).toBe(true);
        });

        it('should schedule auto-deletion for successful verifications', () => {
            const userData = {
                userId: 'test_user_123'
            };
            
            adapter.scheduleAutoDeletion(userData);
            
            expect(mockGDPRValidator.gdprModule.scheduleAutoDelete).toHaveBeenCalledWith(
                ['doc-input', 'phone-input', 'cashapp-token'],
                onePayGDPRConfig.autoDeletion.delayMs
            );
        });
    });

    describe('Enhanced Results', () => {
        it('should enhance verification results with GDPR metadata', () => {
            const baseResult = {
                success: true,
                tier: 'FAST',
                confidence: 90,
                userId: 'test_user_123'
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

        it('should calculate approval rate correctly', () => {
            expect(adapter.calculateApprovalRate({ success: true, tier: 'FAST' })).toBe(95);
            expect(adapter.calculateApprovalRate({ success: true, tier: 'STANDARD' })).toBe(85);
            expect(adapter.calculateApprovalRate({ success: true, tier: 'REVIEW' })).toBe(70);
            expect(adapter.calculateApprovalRate({ success: false })).toBe(0);
        });
    });

    describe('Data Portability', () => {
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
        });
    });

    describe('Right to Object', () => {
        it('should handle marketing objections', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'marketing');
            
            expect(result.success).toBe(true);
            expect(result.objectionType).toBe('marketing');
        });

        it('should reject unknown objection types', async () => {
            const userId = 'test_user_123';
            
            const result = await adapter.handleObjection(userId, 'unknown');
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown objection type');
        });
    });

    describe('Response Creation', () => {
        it('should create consent required response', () => {
            const response = adapter.createConsentRequiredResponse();
            
            expect(response.success).toBe(false);
            expect(response.reason).toBe('CONSENT_REQUIRED');
            expect(response.gdprCompliant).toBe(true);
            expect(response.consentRequired).toBe(true);
            expect(response.lawfulBasis).toBe('CONSENT');
        });

        it('should create disclosure rejection response', () => {
            const disclosure = {
                reason: 'CONSENT_REQUIRED',
                location: 'EU',
                consentText: 'GDPR Consent Required'
            };
            
            const response = adapter.createDisclosureRejection(disclosure);
            
            expect(response.success).toBe(false);
            expect(response.reason).toBe('CONSENT_REQUIRED');
            expect(response.gdprCompliant).toBe(true);
            expect(response.location).toBe('EU');
            expect(response.consentText).toContain('GDPR Consent Required');
        });
    });
});

describe('ConsentManager - Basic Tests', () => {
    let consentManager;
    
    beforeEach(() => {
        consentManager = new ConsentManager();
    });

    it('should initialize correctly', () => {
        expect(consentManager).toBeDefined();
        expect(consentManager.consents).toBeDefined();
        expect(consentManager.consentCount).toBe(0);
    });

    it('should request consent for GDPR purposes', async () => {
        const userData = {
            userId: 'test_user_123'
        };
        
        const consent = await consentManager.requestConsent(userData, 'CASHAPP_LINKING');
        
        expect(consent).toBe(true);
        expect(consentManager.getConsentCount()).toBe(1);
    });

    it('should record consent with proper metadata', async () => {
        const userData = {
            userId: 'test_user_123'
        };
        
        const record = await consentManager.recordConsent(userData.userId, 'CASHAPP_LINKING', true);
        
        expect(record.userId).toBe(userData.userId);
        expect(record.purpose).toBe('CASHAPP_LINKING');
        expect(record.granted).toBe(true);
        expect(record.lawfulBasis).toBe('CONSENT');
        expect(record.revocable).toBe(true);
    });
});

describe('FraudRingDetector - Basic Tests', () => {
    let fraudDetector;
    
    beforeEach(() => {
        fraudDetector = new FraudRingDetector();
    });

    it('should initialize correctly', () => {
        expect(fraudDetector).toBeDefined();
        expect(fraudDetector.detectionCount).toBe(0);
    });

    it('should detect fraud rings with high tension', async () => {
        const userData = {
            userId: 'test_user_123',
            deviceFingerprint: 'device_123'
        };
        
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
        const userData = {
            userId: 'test_user_123',
            deviceFingerprint: 'device_123'
        };
        
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

    it('should have proper data minimization rules', () => {
        const minimization = onePayGDPRConfig.dataMinimization;
        
        expect(minimization.identity.retainSSN).toBe(false);
        expect(minimization.identity.retainPhone).toBe(false);
        expect(minimization.identity.retainName).toBe(false);
        expect(minimization.identity.maxRetentionHours).toBe(0);
        
        expect(minimization.cashApp.retainAccessToken).toBe(true);
        expect(minimization.cashApp.retainUserId).toBe(true);
        expect(minimization.cashApp.maxRetentionHours).toBe(24 * 30);
        
        expect(minimization.plaid.retainAccountId).toBe(true);
        expect(minimization.plaid.retainBalance).toBe(false);
        expect(minimization.plaid.maxRetentionHours).toBe(24 * 7);
    });
});
