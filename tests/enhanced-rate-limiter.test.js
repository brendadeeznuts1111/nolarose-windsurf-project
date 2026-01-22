#!/usr/bin/env bun

// __tests__/enhanced-rate-limiter.test.js - Multi-Dimensional Rate Limiting Tests
// Comprehensive tests for enhanced velocity attack protection

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { EnhancedRateLimiter, createRateLimitMiddleware } from '../security/enhanced-rate-limiter.js';

console.log("🛡️ Enhanced Rate Limiter Test Suite - Loaded");

describe('EnhancedRateLimiter - Multi-Dimensional Protection', () => {
    let rateLimiter;
    
    beforeEach(() => {
        rateLimiter = new EnhancedRateLimiter();
    });
    
    afterEach(() => {
        rateLimiter.stop();
    });

    describe('Basic Rate Limiting', () => {
        it('should allow requests within limits', async () => {
            const request = {
                ip: '192.168.1.1',
                userId: 'user123',
                deviceFingerprint: 'device123',
                path: '/api/verify',
                method: 'POST'
            };

            // First request should be allowed
            const result1 = await rateLimiter.checkRateLimit(request);
            expect(result1.allowed).toBe(true);
            expect(result1.blocked).toBe(false);

            // Second request should also be allowed
            const result2 = await rateLimiter.checkRateLimit(request);
            expect(result2.allowed).toBe(true);
            expect(result2.blocked).toBe(false);
        });

        it('should block requests exceeding IP limits', async () => {
            const request = {
                ip: '192.168.1.2',
                path: '/api/funding',
                method: 'POST'
            };

            // Make requests up to the funding limit (5 per minute)
            for (let i = 0; i < 5; i++) {
                const result = await rateLimiter.checkRateLimit(request);
                expect(result.allowed).toBe(true);
            }

            // Next request should be blocked
            const blockedResult = await rateLimiter.checkRateLimit(request);
            expect(blockedResult.allowed).toBe(false);
            expect(blockedResult.blocked).toBe(true);
            expect(blockedResult.reason).toBe('RATE_LIMIT_EXCEEDED');
            expect(blockedResult.scope).toBe('ip:funding');
        });

        it('should block requests exceeding user ID limits', async () => {
            const request = {
                userId: 'user456',
                path: '/api/funding',
                method: 'POST'
            };

            // Make requests up to the user funding limit (3 per minute)
            for (let i = 0; i < 3; i++) {
                const result = await rateLimiter.checkRateLimit(request);
                expect(result.allowed).toBe(true);
            }

            // Next request should be blocked
            const blockedResult = await rateLimiter.checkRateLimit(request);
            expect(blockedResult.allowed).toBe(false);
            expect(blockedResult.blocked).toBe(true);
            expect(blockedResult.reason).toBe('RATE_LIMIT_EXCEEDED');
            expect(blockedResult.scope).toBe('userId:funding');
        });

        it('should block requests exceeding device fingerprint limits', async () => {
            const request = {
                deviceFingerprint: 'device789',
                path: '/api/funding',
                method: 'POST'
            };

            // Make requests up to the device funding limit (2 per minute)
            for (let i = 0; i < 2; i++) {
                const result = await rateLimiter.checkRateLimit(request);
                expect(result.allowed).toBe(true);
            }

            // Next request should be blocked
            const blockedResult = await rateLimiter.checkRateLimit(request);
            expect(blockedResult.allowed).toBe(false);
            expect(blockedResult.blocked).toBe(true);
            expect(blockedResult.reason).toBe('RATE_LIMIT_EXCEEDED');
            expect(blockedResult.scope).toBe('device:funding');
        });
    });

    describe('Endpoint-Specific Limits', () => {
        it('should apply stricter limits to funding endpoints', async () => {
            const fundingRequest = {
                ip: '192.168.1.10',
                path: '/api/wallet/funding',
                method: 'POST'
            };

            const verificationRequest = {
                ip: '192.168.1.11',
                path: '/api/verify/identity',
                method: 'POST'
            };

            // Funding should be more restrictive (5 per minute vs 10 for verification)
            let fundingAllowed = 0;
            let verificationAllowed = 0;

            // Test funding limits
            for (let i = 0; i < 10; i++) {
                const result = await rateLimiter.checkRateLimit(fundingRequest);
                if (result.allowed) fundingAllowed++;
            }

            // Test verification limits
            for (let i = 0; i < 10; i++) {
                const result = await rateLimiter.checkRateLimit(verificationRequest);
                if (result.allowed) verificationAllowed++;
            }

            expect(fundingAllowed).toBeLessThanOrEqual(5);
            expect(verificationAllowed).toBeGreaterThan(fundingAllowed);
        });

        it('should apply GDPR-critical limits to data export endpoints', async () => {
            const exportRequest = {
                userId: 'user789',
                path: '/api/user/export-data',
                method: 'GET'
            };

            // Data export should be very restrictive (3 per 24 hours for user)
            let exportAllowed = 0;

            for (let i = 0; i < 10; i++) {
                const result = await rateLimiter.checkRateLimit(exportRequest);
                if (result.allowed) exportAllowed++;
            }

            expect(exportAllowed).toBeLessThanOrEqual(5); // Daily limit
        });

        it('should apply consent-specific limits', async () => {
            const consentRequest = {
                ip: '192.168.1.20',
                path: '/api/gdpr/consent',
                method: 'POST'
            };

            // Consent should have moderate limits (20 per minute for IP, 10 per minute for user)
            let consentAllowed = 0;

            for (let i = 0; i < 25; i++) {
                const result = await rateLimiter.checkRateLimit(consentRequest);
                if (result.allowed) consentAllowed++;
            }

            expect(consentAllowed).toBeLessThanOrEqual(20);
        });
    });

    describe('Multi-Scope Enforcement', () => {
        it('should block when any scope exceeds limits', async () => {
            const request = {
                ip: '192.168.1.30',
                userId: 'user_multi',
                deviceFingerprint: 'device_multi',
                path: '/api/funding',
                method: 'POST'
            };

            // Exceed IP limit (5 requests)
            for (let i = 0; i < 5; i++) {
                await rateLimiter.checkRateLimit(request);
            }

            // Next request should be blocked due to IP limit
            const blockedResult = await rateLimiter.checkRateLimit(request);
            expect(blockedResult.allowed).toBe(false);
            expect(blockedResult.blocked).toBe(true);
            expect(blockedResult.scope).toBe('ip:funding');
        });

        it('should track multiple scopes independently', async () => {
            const sameIPRequest = {
                ip: '192.168.1.40',
                userId: 'user_a',
                path: '/api/funding',
                method: 'POST'
            };

            const differentUserRequest = {
                ip: '192.168.1.40',
                userId: 'user_b',
                path: '/api/funding',
                method: 'POST'
            };

            // Same IP should be limited
            let ipAllowedCount = 0;
            for (let i = 0; i < 10; i++) {
                const result = await rateLimiter.checkRateLimit(sameIPRequest);
                if (result.allowed) ipAllowedCount++;
            }

            // Different user with same IP should also be limited by IP
            let userAllowedCount = 0;
            for (let i = 0; i < 10; i++) {
                const result = await rateLimiter.checkRateLimit(differentUserRequest);
                if (result.allowed) userAllowedCount++;
            }

            expect(ipAllowedCount).toBeLessThanOrEqual(5); // IP funding limit
            expect(userAllowedCount).toBeLessThanOrEqual(5); // Still limited by IP
        });
    });

    describe('Suspicious Pattern Detection', () => {
        it('should detect IP rotation patterns', async () => {
            const request = {
                deviceFingerprint: 'device_rotation',
                ip: '192.168.1.50',
                path: '/api/funding',
                method: 'POST'
            };

            // Simulate high velocity to trigger pattern detection
            for (let i = 0; i < 15; i++) {
                request.ip = `192.168.1.${50 + i}`; // Rotate IPs
                await rateLimiter.checkRateLimit(request);
            }

            const result = await rateLimiter.checkRateLimit(request);
            expect(result.suspicious).toBe(true);
            expect(result.patterns).toContain('IP_ROTATION_DETECTED');
            expect(result.riskScore).toBeGreaterThan(40);
        });

        it('should detect user rotation patterns', async () => {
            const request = {
                ip: '192.168.1.60',
                deviceFingerprint: 'device_user_rotation',
                path: '/api/funding',
                method: 'POST'
            };

            // Simulate user rotation
            for (let i = 0; i < 10; i++) {
                request.userId = `user_rotation_${i}`;
                await rateLimiter.checkRateLimit(request);
            }

            const result = await rateLimiter.checkRateLimit(request);
            expect(result.suspicious).toBe(true);
            expect(result.patterns).toContain('USER_ROTATION_DETECTED');
            expect(result.riskScore).toBeGreaterThan(30);
        });

        it('should detect bot-like timing patterns', async () => {
            const request = {
                ip: '192.168.1.70',
                path: '/api/verify',
                method: 'POST'
            };

            // Simulate bot-like regular intervals
            const startTime = Date.now();
            for (let i = 0; i < 10; i++) {
                request.timestamp = startTime + (i * 5000); // Every 5 seconds
                await rateLimiter.checkRateLimit(request);
            }

            const result = await rateLimiter.checkRateLimit(request);
            expect(result.suspicious).toBe(true);
            expect(result.patterns).toContain('BOT_LIKE_PATTERN');
            expect(result.riskScore).toBeGreaterThan(40);
        });

        it('should detect geographic anomalies', async () => {
            const request = {
                ip: '192.168.1.80',
                location: 'US',
                path: '/api/funding',
                method: 'POST'
            };

            // Simulate geographic changes
            const locations = ['US', 'EU', 'CA', 'ASIA'];
            for (let i = 0; i < locations.length; i++) {
                request.location = locations[i];
                await rateLimiter.checkRateLimit(request);
            }

            const result = await rateLimiter.checkRateLimit(request);
            expect(result.suspicious).toBe(true);
            expect(result.patterns).toContain('GEOGRAPHIC_ANOMALY');
            expect(result.riskScore).toBeGreaterThan(30);
        });
    });

    describe('Block Management', () => {
        it('should track blocked entities', async () => {
            const request = {
                ip: '192.168.1.90',
                path: '/api/funding',
                method: 'POST'
            };

            // Exceed limit to trigger block
            for (let i = 0; i < 6; i++) {
                await rateLimiter.checkRateLimit(request);
            }

            // Check if IP is blocked
            const isBlocked = rateLimiter.isBlocked('ip', '192.168.1.90');
            expect(isBlocked).toBe(true);

            // Check block status
            const blockStatus = rateLimiter.getBlockStatus('ip', '192.168.1.90');
            expect(blockStatus).toBeDefined();
            expect(blockStatus.blocked).toBe(true);
            expect(blockStatus.reason).toBe('RATE_LIMIT_EXCEEDED');
        });

        it('should allow manual blocking', () => {
            rateLimiter.blockEntity('ip', '192.168.1.100', 'MANUAL_BLOCK', 60 * 1000);

            const isBlocked = rateLimiter.isBlocked('ip', '192.168.1.100');
            expect(isBlocked).toBe(true);

            const blockStatus = rateLimiter.getBlockStatus('ip', '192.168.1.100');
            expect(blockStatus.reason).toBe('MANUAL_BLOCK');
        });

        it('should allow manual unblocking', () => {
            // First block
            rateLimiter.blockEntity('userId', 'user_manual_block', 'MANUAL_BLOCK');
            expect(rateLimiter.isBlocked('userId', 'user_manual_block')).toBe(true);

            // Then unblock
            const wasBlocked = rateLimiter.unblockEntity('userId', 'user_manual_block');
            expect(wasBlocked).toBe(true);
            expect(rateLimiter.isBlocked('userId', 'user_manual_block')).toBe(false);
        });
    });

    describe('Statistics and Monitoring', () => {
        it('should provide comprehensive statistics', () => {
            const stats = rateLimiter.getStatistics();

            expect(stats).toBeDefined();
            expect(stats.timestamp).toBeDefined();
            expect(stats.counters).toBeGreaterThanOrEqual(0);
            expect(stats.activeBlocks).toBeGreaterThanOrEqual(0);
            expect(stats.suspiciousPatterns).toBeGreaterThanOrEqual(0);
            expect(stats.limits).toBeDefined();
            expect(Array.isArray(stats.limits)).toBe(true);
        });

        it('should export configuration for monitoring', () => {
            const config = rateLimiter.exportConfig();

            expect(config).toBeDefined();
            expect(config.limits).toBeDefined();
            expect(config.statistics).toBeDefined();
            expect(config.timestamp).toBeDefined();
        });
    });

    describe('Middleware Integration', () => {
        it('should create functional middleware', async () => {
            const middleware = createRateLimitMiddleware();
            
            const mockRequest = {
                ip: '192.168.1.200',
                path: '/api/funding',
                method: 'POST'
            };

            const mockResponse = {
                status: (code) => ({
                    json: (data) => ({ statusCode: code, data })
                }),
                set: () => {}
            };

            let nextCalled = false;
            const next = () => { nextCalled = true; };

            // Should call next for allowed request
            await middleware(mockRequest, mockResponse, next);
            expect(nextCalled).toBe(true);
        });

        it('should handle blocked requests in middleware', async () => {
            const middleware = createRateLimitMiddleware();
            
            const mockRequest = {
                ip: '192.168.1.201',
                path: '/api/funding',
                method: 'POST'
            };

            const mockResponse = {
                status: (code) => ({
                    json: (data) => ({ statusCode: code, data })
                }),
                set: () => {}
            };

            let nextCalled = false;
            const next = () => { nextCalled = true; };

            // Exceed limit
            for (let i = 0; i < 6; i++) {
                await middleware(mockRequest, mockResponse, next);
            }

            // Should not call next for blocked request
            nextCalled = false;
            const result = await middleware(mockRequest, mockResponse, next);
            expect(nextCalled).toBe(false);
        });
    });

    describe('Privacy and Security', () => {
        it('should hash sensitive data in logs', () => {
            const request = {
                ip: '192.168.1.250',
                userId: 'sensitive_user',
                deviceFingerprint: 'sensitive_device',
                path: '/api/funding',
                method: 'POST'
            };

            const sanitized = rateLimiter.sanitizeRequest(request);

            expect(sanitized.ip).not.toBe('192.168.1.250');
            expect(sanitized.ip).toHaveLength(12);
            expect(sanitized.userId).not.toBe('sensitive_user');
            expect(sanitized.userId).toHaveLength(12);
            expect(sanitized.deviceFingerprint).not.toBe('sensitive_device');
            expect(sanitized.deviceFingerprint).toHaveLength(12);
        });

        it('should hash IPs consistently', () => {
            const ip = '192.168.1.1';
            const hash1 = rateLimiter.hashIP(ip);
            const hash2 = rateLimiter.hashIP(ip);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(12);
        });

        it('should hash values consistently', () => {
            const value = 'test_value';
            const hash1 = rateLimiter.hashValue(value);
            const hash2 = rateLimiter.hashValue(value);

            expect(hash1).toBe(hash2);
            expect(hash1).toHaveLength(12);
        });
    });

    describe('Cleanup and Maintenance', () => {
        it('should cleanup expired data', () => {
            // Add some test data
            rateLimiter.blockEntity('ip', '192.168.1.300', 'TEST', 1); // 1ms block
            
            // Should be blocked initially
            expect(rateLimiter.isBlocked('ip', '192.168.1.300')).toBe(true);

            // Wait for block to expire and cleanup
            setTimeout(() => {
                rateLimiter.cleanup();
                expect(rateLimiter.isBlocked('ip', '192.168.1.300')).toBe(false);
            }, 10);
        });

        it('should stop cleanup interval', () => {
            const rateLimiter2 = new EnhancedRateLimiter();
            expect(rateLimiter2.cleanupInterval).toBeDefined();
            
            rateLimiter2.stop();
            expect(rateLimiter2.cleanupInterval).toBeNull();
        });
    });

    describe('Edge Cases', () => {
        it('should handle requests without identifiers', async () => {
            const emptyRequest = {
                path: '/api/test',
                method: 'GET'
            };

            const result = await rateLimiter.checkRateLimit(emptyRequest);
            expect(result.allowed).toBe(true);
            expect(result.blocked).toBe(false);
        });

        it('should handle unknown endpoints', async () => {
            const request = {
                ip: '192.168.1.400',
                path: '/api/unknown/endpoint',
                method: 'POST'
            };

            const result = await rateLimiter.checkRateLimit(request);
            expect(result.allowed).toBe(true);
            expect(result.blocked).toBe(false);
        });

        it('should handle malformed requests gracefully', async () => {
            const malformedRequest = {
                ip: null,
                userId: undefined,
                deviceFingerprint: '',
                path: '/api/test',
                method: 'POST'
            };

            const result = await rateLimiter.checkRateLimit(malformedRequest);
            expect(result.allowed).toBe(true);
            expect(result.blocked).toBe(false);
        });
    });
});
