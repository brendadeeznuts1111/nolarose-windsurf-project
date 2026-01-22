#!/usr/bin/env bun

// __tests__/validation-engine.test.js - Validation Engine Module Test Suite
// 100% coverage tests for the Validation Engine module

import { describe, it, expect, beforeEach, afterEach, vi } from 'bun:test';
import { ValidationEngine } from '../modules/validation-engine.js';
import { TestDataFactory, TestUtils } from './setup.js';

console.log("🧪 Validation Engine Test Suite - Loaded");

describe('ValidationEngine Module', () => {
    let validationEngine;
    let config;
    
    beforeEach(async () => {
        TestUtils.setupTestEnvironment();
        
        config = TestDataFactory.createConfig().verifier;
        validationEngine = new ValidationEngine(config);
        await validationEngine.init();
    });
    
    afterEach(async () => {
        if (validationEngine) {
            await validationEngine.shutdown();
        }
        TestUtils.cleanupTestEnvironment();
    });
    
    describe('Module Initialization', () => {
        it('should initialize with correct configuration', () => {
            expect(validationEngine).toBeDefined();
            expect(validationEngine.config).toBeDefined();
            expect(validationEngine.config.fuzzyThreshold).toBe(config.fuzzyThreshold);
            expect(validationEngine.config.phoneMatchThreshold).toBe(config.phoneMatchThreshold);
            expect(validationEngine.initialized).toBe(true);
        });
        
        it('should validate configuration thresholds', () => {
            expect(() => {
                new ValidationEngine({ fuzzyThreshold: 2 }); // Invalid (> 1)
            }).toThrow('fuzzyThreshold must be between 0 and 1');
            
            expect(() => {
                new ValidationEngine({ phoneMatchThreshold: -1 }); // Invalid (< 0)
            }).toThrow('phoneMatchThreshold must be between 0 and 1');
        });
        
        it('should initialize stores and metrics', () => {
            expect(validationEngine.verificationStore).toBeInstanceOf(Map);
            expect(validationEngine.validationCache).toBeInstanceOf(Map);
            expect(validationEngine.metrics).toBeDefined();
        });
        
        it('should not initialize twice', async () => {
            const initSpy = vi.spyOn(validationEngine, 'validateConfig');
            
            await validationEngine.init(); // Second initialization
            
            expect(initSpy).toHaveBeenCalledTimes(0);
        });
    });
    
    describe('preScreenUser', () => {
        it('should pass valid user data', async () => {
            const userData = TestDataFactory.createUserData();
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(true);
            expect(result.userId).toBe(userData.userId);
            expect(result.score).toBe(100);
            expect(result.issues).toEqual([]);
            expect(result.validationTime).toBeDefined();
        });
        
        it('should reject invalid email', async () => {
            const userData = TestDataFactory.createUserData({
                email: 'invalid-email'
            });
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(false);
            expect(result.issues).toContain('Invalid email format');
            expect(result.score).toBe(70); // 100 - 30
        });
        
        it('should reject invalid phone', async () => {
            const userData = TestDataFactory.createUserData({
                phone: '123'
            });
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(false);
            expect(result.issues).toContain('Invalid phone format');
            expect(result.score).toBe(75); // 100 - 25
        });
        
        it('should reject invalid user ID', async () => {
            const userData = TestDataFactory.createUserData({
                userId: 'ab' // Too short
            });
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(false);
            expect(result.issues).toContain('Invalid user ID');
            expect(result.score).toBe(80); // 100 - 20
        });
        
        it('should detect suspicious patterns', async () => {
            const userData = TestDataFactory.createUserData({
                email: 'test@example.com',
                userId: 'test_user_123'
            });
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(false);
            expect(result.issues).toContain('Suspicious patterns detected');
            expect(result.score).toBe(60); // 100 - 40
        });
        
        it('should enforce rate limiting', async () => {
            const userData = TestDataFactory.createUserData();
            
            // Make 6 attempts (exceeds limit of 5)
            const results = [];
            for (let i = 0; i < 6; i++) {
                results.push(await validationEngine.preScreenUser(userData));
            }
            
            // Last attempt should be rate limited
            expect(results[5].passed).toBe(false);
            expect(results[5].issues).toContain('Rate limit exceeded');
            expect(results[5].score).toBe(50); // 100 - 50
        });
        
        it('should handle multiple validation issues', async () => {
            const userData = TestDataFactory.createUserData({
                email: 'invalid-email',
                phone: '123',
                userId: 'test_user_123' // Suspicious pattern
            });
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(false);
            expect(result.issues).toContain('Invalid email format');
            expect(result.issues).toContain('Invalid phone format');
            expect(result.issues).toContain('Suspicious patterns detected');
            expect(result.score).toBe(25); // 100 - 30 - 25 - 20
        });
        
        it('should handle validation errors gracefully', async () => {
            const userData = TestDataFactory.createUserData();
            
            validationEngine.isValidEmail = vi.fn().mockImplementation(() => {
                throw new Error('Email validation error');
            });
            
            const result = await validationEngine.preScreenUser(userData);
            
            expect(result.passed).toBe(false);
            expect(result.issues).toContain('Email validation error');
        });
    });
    
    describe('crossValidateAll', () => {
        it('should cross-validate successfully with all sources', () => {
            const identityResult = TestDataFactory.createIdentityResult();
            const cashAppResult = TestDataFactory.createOAuthResult();
            const plaidResult = TestDataFactory.createPlaidResult();
            
            const result = validationEngine.crossValidateAll(identityResult, cashAppResult, plaidResult);
            
            expect(result.success).toBe(true);
            expect(result.verificationId).toBeDefined();
            expect(result.userId).toBe(identityResult.userId);
            expect(result.validation.passed).toBe(true);
            expect(result.validation.confidence).toBeGreaterThan(0);
            expect(result.validation.riskScore).toBeGreaterThanOrEqual(0);
            expect(result.validationPassed).toBe(true);
        });
        
        it('should handle missing Cash App result', () => {
            const identityResult = TestDataFactory.createIdentityResult();
            const plaidResult = TestDataFactory.createPlaidResult();
            
            const result = validationEngine.crossValidateAll(identityResult, null, plaidResult);
            
            expect(result.success).toBe(true);
            expect(result.sources.cashApp).toBe(false);
            expect(result.sources.plaid).toBe(true);
            expect(result.validation.confidence).toBeLessThan(100); // Lower confidence with missing source
        });
        
        it('should handle missing Plaid result', () => {
            const identityResult = TestDataFactory.createIdentityResult();
            const cashAppResult = TestDataFactory.createOAuthResult();
            
            const result = validationEngine.crossValidateAll(identityResult, cashAppResult, null);
            
            expect(result.success).toBe(true);
            expect(result.sources.cashApp).toBe(true);
            expect(result.sources.plaid).toBe(false);
        });
        
        it('should reject on low consistency', () => {
            const identityResult = TestDataFactory.createIdentityResult({
                email: 'identity@example.com',
                phone: '+1234567890'
            });
            
            const cashAppResult = TestDataFactory.createOAuthResult({
                email: 'different@example.com', // Different email
                phone: '+1234567890'
            });
            
            const plaidResult = TestDataFactory.createPlaidResult({
                email: 'another@example.com', // Different email
                phone: '+1234567890'
            });
            
            const result = validationEngine.crossValidateAll(identityResult, cashAppResult, plaidResult);
            
            expect(result.validation.passed).toBe(false);
            expect(result.validation.confidence).toBeLessThan(60);
        });
        
        it('should calculate cross-validation scores correctly', () => {
            const identityResult = TestDataFactory.createIdentityResult({
                email: 'test@example.com',
                phone: '+1234567890',
                name: 'John Doe'
            });
            
            const cashAppResult = TestDataFactory.createOAuthResult({
                email: 'test@example.com',
                phone: '+1 (555) 123-4567', // Different format, same number
                name: 'John Doe'
            });
            
            const plaidResult = TestDataFactory.createPlaidResult({
                email: 'test@example.com',
                phone: '5551234567', // Different format, same number
                accounts: [{
                    account_id: 'acc_123456789',
                    name: 'Test Checking',
                    type: 'depository'
                }]
            });
            
            const result = validationEngine.crossValidateAll(identityResult, cashAppResult, plaidResult);
            
            expect(result.crossValidation.identityCashApp).toBeGreaterThan(80);
            expect(result.crossValidation.identityPlaid).toBeGreaterThan(80);
            expect(result.crossValidation.cashAppPlaid).toBeGreaterThan(80);
            expect(result.crossValidation.overallConsistency).toBeGreaterThan(0.8);
        });
        
        it('should handle validation errors gracefully', () => {
            const identityResult = TestDataFactory.createIdentityResult();
            const cashAppResult = TestDataFactory.createOAuthResult();
            const plaidResult = TestDataFactory.createPlaidResult();
            
            validationEngine.validateIdentityCashAppMatch = vi.fn().mockImplementation(() => {
                throw new Error('Validation error');
            });
            
            const result = validationEngine.crossValidateAll(identityResult, cashAppResult, plaidResult);
            
            expect(result.success).toBe(false);
            expect(result.error).toBe('Validation error');
        });
        
        it('should cache verification results', () => {
            const identityResult = TestDataFactory.createIdentityResult();
            const cashAppResult = TestDataFactory.createOAuthResult();
            const plaidResult = TestDataFactory.createPlaidResult();
            
            const result1 = validationEngine.crossValidateAll(identityResult, cashAppResult, plaidResult);
            const result2 = validationEngine.crossValidateAll(identityResult, cashAppResult, plaidResult);
            
            expect(result1.verificationId).toBe(result2.verificationId);
            expect(validationEngine.verificationStore.size).toBe(1);
        });
    });
    
    describe('Fuzzy Matching', () => {
        it('should match identical strings', () => {
            const similarity = validationEngine.fuzzyMatch('test@example.com', 'test@example.com');
            expect(similarity).toBe(1.0);
        });
        
        it('should handle case differences', () => {
            const similarity = validationEngine.fuzzyMatch('Test@Example.com', 'test@example.com');
            expect(similarity).toBe(1.0);
        });
        
        it('should handle whitespace differences', () => {
            const similarity = validationEngine.fuzzyMatch('test@example.com', '  test@example.com  ');
            expect(similarity).toBe(1.0);
        });
        
        it('should calculate Levenshtein distance correctly', () => {
            const distance = validationEngine.levenshteinDistance('kitten', 'sitting');
            expect(distance).toBe(3);
        });
        
        it('should handle empty strings', () => {
            expect(validationEngine.fuzzyMatch('', '')).toBe(1.0);
            expect(validationEngine.fuzzyMatch('test', '')).toBe(0.0);
            expect(validationEngine.fuzzyMatch('', 'test')).toBe(0.0);
            expect(validationEngine.fuzzyMatch(null, 'test')).toBe(0.0);
            expect(validationEngine.fuzzyMatch('test', null)).toBe(0.0);
        });
        
        it('should measure fuzzy similarity', () => {
            const similarity1 = validationEngine.fuzzyMatch('john.doe@example.com', 'jon.doe@example.com');
            expect(similarity1).toBeGreaterThan(0.8);
            expect(similarity1).toBeLessThan(1.0);
            
            const similarity2 = validationEngine.fuzzyMatch('completely.different', 'another.string');
            expect(similarity2).toBeLessThan(0.5);
        });
        
        it('should update fuzzy match metrics', () => {
            validationEngine.metrics.fuzzyMatches = 0;
            
            validationEngine.fuzzyMatch('test1', 'test2');
            validationEngine.fuzzyMatch('test3', 'test4');
            
            expect(validationEngine.metrics.fuzzyMatches).toBe(2);
        });
    });
    
    describe('Phone Number Comparison', () => {
        it('should match identical phone numbers', () => {
            const similarity = validationEngine.comparePhoneNumbers('+1234567890', '+1234567890');
            expect(similarity).toBe(1.0);
        });
        
        it('should normalize different formats', () => {
            const similarity = validationEngine.comparePhoneNumbers('+1 (555) 123-4567', '5551234567');
            expect(similarity).toBe(1.0);
        });
        
        it('should handle country code differences', () => {
            const similarity = validationEngine.comparePhoneNumbers('5551234567', '+15551234567');
            expect(similarity).toBe(0.9); // Subset match
        });
        
        it('should handle invalid phone numbers', () => {
            expect(validationEngine.comparePhoneNumbers('invalid', '5551234567')).toBeLessThan(0.5);
            expect(validationEngine.comparePhoneNumbers('5551234567', 'invalid')).toBeLessThan(0.5);
            expect(validationEngine.comparePhoneNumbers(null, '5551234567')).toBe(0.0);
            expect(validationEngine.comparePhoneNumbers('5551234567', null)).toBe(0.0);
        });
        
        it('should normalize phone numbers correctly', () => {
            const normalized1 = validationEngine.normalizePhoneNumber('+1 (555) 123-4567');
            const normalized2 = validationEngine.normalizePhoneNumber('555-123-4567');
            const normalized3 = validationEngine.normalizePhoneNumber('(555) 123 4567');
            
            expect(normalized1).toBe('5551234567');
            expect(normalized2).toBe('5551234567');
            expect(normalized3).toBe('5551234567');
        });
    });
    
    describe('Email Validation', () => {
        it('should validate correct email formats', () => {
            expect(validationEngine.isValidEmail('test@example.com')).toBe(true);
            expect(validationEngine.isValidEmail('user.name@domain.co.uk')).toBe(true);
            expect(validationEngine.isValidEmail('user+tag@example.org')).toBe(true);
        });
        
        it('should reject invalid email formats', () => {
            expect(validationEngine.isValidEmail('invalid-email')).toBe(false);
            expect(validationEngine.isValidEmail('@example.com')).toBe(false);
            expect(validationEngine.isValidEmail('user@')).toBe(false);
            expect(validationEngine.isValidEmail('user@.com')).toBe(false);
            expect(validationEngine.isValidEmail('')).toBe(false);
        });
    });
    
    describe('Phone Validation', () => {
        it('should validate correct phone formats', () => {
            expect(validationEngine.isValidPhone('+1234567890')).toBe(true);
            expect(validationEngine.isValidPhone('(555) 123-4567')).toBe(true);
            expect(validationEngine.isValidPhone('555-123-4567')).toBe(true);
            expect(validationEngine.isValidPhone('5551234567')).toBe(true);
        });
        
        it('should reject invalid phone formats', () => {
            expect(validationEngine.isValidPhone('123')).toBe(false);
            expect(validationEngine.isValidPhone('abc')).toBe(false);
            expect(validationEngine.isValidPhone('')).toBe(false);
        });
    });
    
    describe('Suspicious Pattern Detection', () => {
        it('should detect test patterns', () => {
            const userData1 = TestDataFactory.createUserData({ email: 'test@example.com' });
            const userData2 = TestDataFactory.createUserData({ userId: 'demo_user_123' });
            const userData3 = TestDataFactory.createUserData({ phone: '5550000000' });
            
            expect(validationEngine.hasSuspiciousPatterns(userData1)).toBe(true);
            expect(validationEngine.hasSuspiciousPatterns(userData2)).toBe(true);
            expect(validationEngine.hasSuspiciousPatterns(userData3)).toBe(true);
        });
        
        it('should allow legitimate patterns', () => {
            const userData = TestDataFactory.createUserData({
                email: 'real.user@example.com',
                userId: 'real_user_456',
                phone: '+15551234567'
            });
            
            expect(validationEngine.hasSuspiciousPatterns(userData)).toBe(false);
        });
    });
    
    describe('Rate Limiting', () => {
        it('should track user attempts correctly', async () => {
            const userData = TestDataFactory.createUserData();
            
            // Make 3 attempts
            for (let i = 0; i < 3; i++) {
                await validationEngine.preScreenUser(userData);
            }
            
            expect(validationEngine.validationCache.has(userData.userId)).toBe(true);
            
            const attempts = validationEngine.validationCache.get(userData.userId);
            expect(attempts.length).toBe(3);
        });
        
        it('should clean old attempts', async () => {
            const userData = TestDataFactory.createUserData();
            
            // Add old attempt
            validationEngine.validationCache.set(userData.userId, [Date.now() - 7200000]); // 2 hours ago
            
            await validationEngine.cleanupExpired();
            
            expect(validationEngine.validationCache.has(userData.userId)).toBe(false);
        });
    });
    
    describe('getVerificationStatus', () => {
        it('should return verification status for valid ID', async () => {
            const verificationId = 'ver_123';
            const verificationData = {
                verificationId,
                userId: 'test_user_123',
                timestamp: Date.now(),
                validation: { passed: true, confidence: 90 }
            };
            
            validationEngine.verificationStore.set(verificationId, verificationData);
            
            const result = await validationEngine.getVerificationStatus(verificationId);
            
            expect(result.found).toBe(true);
            expect(result.verification.verificationId).toBe(verificationId);
            expect(result.verification.userId).toBe('te****23');
        });
        
        it('should return not found for invalid ID', async () => {
            const result = await validationEngine.getVerificationStatus('invalid_ver');
            
            expect(result.found).toBe(false);
            expect(result.error).toBe('Verification not found');
        });
    });
    
    describe('Metrics', () => {
        it('should track metrics correctly', () => {
            validationEngine.metrics = {
                totalValidations: 0,
                successfulValidations: 0,
                failedValidations: 0,
                averageValidationTime: 0,
                crossValidations: 0,
                fuzzyMatches: 0
            };
            
            validationEngine.updateMetrics(100, true);
            validationEngine.updateMetrics(200, true);
            validationEngine.updateMetrics(150, false);
            
            expect(validationEngine.metrics.totalValidations).toBe(3);
            expect(validationEngine.metrics.successfulValidations).toBe(2);
            expect(validationEngine.metrics.failedValidations).toBe(1);
            expect(validationEngine.metrics.averageValidationTime).toBe(150); // (100 + 200 + 150) / 3
            expect(validationEngine.metrics.successRate).toBe(66.67); // 2/3 * 100
        });
        
        it('should handle zero validations gracefully', () => {
            validationEngine.metrics.totalValidations = 0;
            validationEngine.metrics.successfulValidations = 0;
            
            const metrics = validationEngine.getMetrics();
            expect(metrics.successRate).toBe(0);
        });
    });
    
    describe('Health Check', () => {
        it('should return healthy status', async () => {
            const health = await validationEngine.healthCheck();
            
            expect(health.status).toBe('healthy');
            expect(health.initialized).toBe(true);
            expect(health.metrics).toBeDefined();
            expect(health.config).toBeDefined();
        });
        
        it('should return unhealthy status on error', async () => {
            validationEngine.validateConfig = vi.fn().mockImplementation(() => {
                throw new Error('Configuration error');
            });
            
            const health = await validationEngine.healthCheck();
            
            expect(health.status).toBe('unhealthy');
            expect(health.error).toBe('Configuration error');
        });
        
        it('should include configuration summary', async () => {
            const health = await validationEngine.healthCheck();
            
            expect(health.config.fuzzyThreshold).toBe(config.fuzzyThreshold);
            expect(health.config.phoneMatchThreshold).toBe(config.phoneMatchThreshold);
            expect(health.config.emailMatchThreshold).toBe(config.emailMatchThreshold);
            expect(health.config.nameMatchThreshold).toBe(config.nameMatchThreshold);
        });
    });
    
    describe('Cleanup', () => {
        it('should cleanup expired verifications', async () => {
            const expiredId = 'expired_ver';
            const validId = 'valid_ver';
            
            // Add expired verification
            validationEngine.verificationStore.set(expiredId, {
                timestamp: Date.now() - (config.verificationExpiry + 1000)
            });
            
            // Add valid verification
            validationEngine.verificationStore.set(validId, {
                timestamp: Date.now()
            });
            
            await validationEngine.cleanupExpired();
            
            expect(validationEngine.verificationStore.has(expiredId)).toBe(false);
            expect(validationEngine.verificationStore.has(validId)).toBe(true);
        });
        
        it('should shutdown gracefully', async () => {
            validationEngine.verificationStore.set('ver1', { data: 'test' });
            validationEngine.validationCache.set('user1', ['attempt1']);
            
            await validationEngine.shutdown();
            
            expect(validationEngine.verificationStore.size).toBe(0);
            expect(validationEngine.validationCache.size).toBe(0);
            expect(validationEngine.initialized).toBe(false);
        });
    });
});
