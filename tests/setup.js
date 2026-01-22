#!/usr/bin/env bun

// __tests__/setup.js - Global Test Setup and Utilities
// Shared mocks, utilities, and configuration for all test suites

import { beforeEach, afterEach, vi } from 'bun:test';

console.log("🧪 Test Suite Setup - Loaded");

/**
 * Global test setup for modular Cash App adapter
 * 
 * Provides:
 * - Mock implementations for external dependencies
 * - Test utilities and helpers
 * - Configuration mocking
 * - Common test data factories
 */

// Global mocks for external dependencies
global.console = {
    ...console,
    // Suppress console.log in tests unless explicitly needed
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn()
};

// Mock performance API
global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    getEntriesByType: vi.fn(() => [])
};

// Mock crypto API
global.crypto = {
    randomBytes: vi.fn((size) => {
        const bytes = new Uint8Array(size);
        for (let i = 0; i < size; i++) {
            bytes[i] = Math.floor(Math.random() * 256);
        }
        return bytes;
    }),
    createHash: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn((format) => {
            if (format === 'hex') {
                return 'mock_hash_' + Math.random().toString(36).substr(2, 9);
            }
            return new Uint8Array(32);
        })
    }))
};

// Mock fetch API
global.fetch = vi.fn();

// Mock process.env
global.process = {
    ...process,
    env: {
        NODE_ENV: 'test',
        CASH_APP_CLIENT_ID: 'test_cash_app_client_id',
        CASH_APP_CLIENT_SECRET: 'test_cash_app_client_secret',
        PLAID_CLIENT_ID: 'test_plaid_client_id',
        PLAID_SECRET: 'test_plaid_secret',
        PLAID_ENV: 'sandbox'
    }
};

// Ensure environment variables are available before loading modules
process.env.NODE_ENV = 'test';
process.env.CASH_APP_CLIENT_ID = 'test_cash_app_client_id';
process.env.CASH_APP_CLIENT_SECRET = 'test_cash_app_client_secret';
process.env.PLAID_CLIENT_ID = 'test_plaid_client_id';
process.env.PLAID_SECRET = 'test_plaid_secret';
process.env.PLAID_ENV = 'sandbox';

// Mock file system operations
const mockFileSystem = new Map();

// Mock fs module
const originalFs = await import('fs');
vi.mock('fs', () => ({
    readFileSync: vi.fn((path, encoding) => {
        const content = mockFileSystem.get(path);
        if (!content) {
            // Try to read from the real file system for fallback
            try {
                return originalFs.readFileSync(path, encoding);
            } catch (error) {
                throw new Error(`File not found: ${path}`);
            }
        }
        return encoding === 'utf-8' ? content : content;
    }),
    writeFileSync: vi.fn((path, content) => {
        mockFileSystem.set(path, content);
    }),
    existsSync: vi.fn((path) => {
        if (mockFileSystem.has(path)) return true;
        // Check real file system as fallback
        try {
            return originalFs.existsSync(path);
        } catch {
            return false;
        }
    }),
    mkdirSync: vi.fn()
}));

// Mock TOML configuration files
function setupMockConfigs() {
    // Main configuration
    mockFileSystem.set('./config/config.toml', `
[cashApp]
clientId = "\${CASH_APP_CLIENT_ID}"
clientSecret = "\${CASH_APP_CLIENT_SECRET}"
redirectUri = "http://localhost:3000/callback"
scope = "wallet:read wallet:write"
tokenExpiry = 3600
stateExpiry = 600

[plaid]
clientId = "\${PLAID_CLIENT_ID}"
secret = "\${PLAID_SECRET}"
env = "sandbox"
products = ["auth", "transactions"]
countryCodes = ["US"]
language = "en"
webhook = null
cacheExpiry = 1800

[verifier]
fuzzyThreshold = 0.8
phoneMatchThreshold = 0.9
emailMatchThreshold = 0.85
nameMatchThreshold = 0.75
verificationExpiry = 86400000
maxRetries = 3

[verifier.routing]
enableAdaptiveRouting = true
conflictDetection = true
manualReviewThreshold = 70
queueHighRisk = true
escalationThreshold = 85

[verifier.performance]
maxResponseTime = 5000
maxQueueSize = 1000
retryAttempts = 3

[logging]
level = "info"
enableMetrics = true
enableTracing = true
maskPII = true
logToFile = false
logDirectory = "./logs"

[performance]
enableCaching = true
cacheSize = 1000
cacheTTL = 3600000
enableCompression = true
enableMetrics = true
metricsInterval = 60000
`);

    // Development configuration
    mockFileSystem.set('./config/development.toml', `
[logging]
level = "debug"
logToFile = true

[performance]
enableCaching = false

[verifier]
fuzzyThreshold = 0.7
manualReviewThreshold = 60
`);

    // Production configuration
    mockFileSystem.set('./config/production.toml', `
[logging]
level = "warn"
logToFile = true

[performance]
enableCaching = true
cacheSize = 5000

[verifier]
fuzzyThreshold = 0.9
manualReviewThreshold = 80
`);

    // Local configuration
    mockFileSystem.set('./config/local.toml', `
[cashApp]
clientId = "test_client_id"
clientSecret = "test_client_secret"

[plaid]
clientId = "test_client_id"
secret = "test_secret"
webhook = "https://test.example.com/webhook"
`);
}

// Initialize mock configurations
setupMockConfigs();

/**
 * Test data factories
 */
export const TestDataFactory = {
    /**
     * Create mock user data
     */
    createUserData(overrides = {}) {
        return {
            userId: 'test_user_123',
            email: 'test@example.com',
            phone: '+1234567890',
            accountNumber: '123456789',
            routingNumber: '021000021',
            documents: {
                idCard: 'front_image_data',
                selfie: 'selfie_image_data'
            },
            ...overrides
        };
    },

    /**
     * Create mock identity result
     */
    createIdentityResult(overrides = {}) {
        return {
            success: true,
            userId: 'test_user_123',
            verificationId: `ver_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            confidence: 85,
            riskScore: 25,
            documents: { verified: true },
            email: { verified: true },
            phone: { verified: true },
            age: { verified: true, value: 25 },
            address: { verified: true },
            ...overrides
        };
    },

    /**
     * Create mock OAuth result
     */
    createOAuthResult(overrides = {}) {
        return {
            success: true,
            userId: 'test_user_123',
            flowId: `flow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            state: 'state_' + Math.random().toString(36).substr(2, 9),
            authorizationUrl: 'https://cash.app/oauth/authorize?code=test',
            accessToken: 'access_token_' + Math.random().toString(36).substr(2, 9),
            scope: 'wallet:read wallet:write',
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
            ...overrides
        };
    },

    /**
     * Create mock Plaid result
     */
    createPlaidResult(overrides = {}) {
        return {
            success: true,
            userId: 'test_user_123',
            linkToken: 'link-sandbox-test-token',
            accounts: [
                {
                    account_id: 'acc_123',
                    name: 'Test Checking',
                    type: 'depository',
                    subtype: 'checking',
                    verification_status: 'verified',
                    balances: { current: 1000, available: 800 }
                }
            ],
            verification: {
                accountMatch: true,
                balanceVerified: true,
                riskScore: 10,
                confidence: 90
            },
            transactionAnalysis: {
                totalTransactions: 50,
                averageAmount: 150,
                riskIndicators: [],
                patterns: ['positive_cash_flow']
            },
            ...overrides
        };
    },

    /**
     * Create mock configuration
     */
    createConfig(overrides = {}) {
        return {
            cashApp: {
                clientId: 'test_client_id',
                clientSecret: 'test_client_secret',
                redirectUri: 'http://localhost:3000/callback',
                scope: 'wallet:read wallet:write',
                tokenExpiry: 3600,
                stateExpiry: 600,
                ...overrides.cashApp
            },
            plaid: {
                clientId: 'test_client_id',
                secret: 'test_secret',
                env: 'sandbox',
                products: ['auth', 'transactions'],
                countryCodes: ['US'],
                language: 'en',
                webhook: null,
                cacheExpiry: 1800,
                ...overrides.plaid
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
                retryAttempts: 3,
                ...overrides.verifier
            },
            logging: {
                level: 'info',
                enableMetrics: true,
                enableTracing: true,
                maskPII: true,
                logToFile: false,
                logDirectory: './logs',
                ...overrides.logging
            },
            performance: {
                enableCaching: true,
                cacheSize: 1000,
                cacheTTL: 3600000,
                enableCompression: true,
                enableMetrics: true,
                metricsInterval: 60000,
                ...overrides.performance
            },
            ...overrides
        };
    }
};

/**
 * Mock GDPR validator
 */
export const createMockGDPRValidator = (overrides = {}) => {
    return {
        gdprModule: { enabled: true },
        eventBus: {
            emit: vi.fn(),
            on: vi.fn(),
            off: vi.fn()
        },
        validateIdentity: vi.fn().mockResolvedValue(TestDataFactory.createIdentityResult()),
        ...overrides
    };
};

/**
 * Test utilities
 */
export const TestUtils = {
    /**
     * Wait for async operations
     */
    async waitFor(ms = 0) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Create a promise that resolves after a condition is met
     */
    async waitForCondition(condition, timeout = 5000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeout) {
            if (condition()) {
                return true;
            }
            await this.waitFor(10);
        }
        throw new Error('Condition not met within timeout');
    },

    /**
     * Mock fetch response
     */
    mockFetchResponse(data, options = {}) {
        const response = {
            ok: options.ok !== false,
            status: options.status || 200,
            statusText: options.statusText || 'OK',
            json: vi.fn().mockResolvedValue(data),
            text: vi.fn().mockResolvedValue(JSON.stringify(data)),
            headers: new Map(Object.entries(options.headers || {}))
        };
        
        global.fetch.mockResolvedValue(response);
        return response;
    },

    /**
     * Reset all mocks
     */
    resetAllMocks() {
        vi.clearAllMocks();
        global.fetch.mockClear();
        console.log.mockClear();
        console.warn.mockClear();
        console.error.mockClear();
    },

    /**
     * Setup common test environment
     */
    setupTestEnvironment() {
        this.resetAllMocks();
        setupMockConfigs();
    },

    /**
     * Cleanup test environment
     */
    cleanupTestEnvironment() {
        this.resetAllMocks();
        mockFileSystem.clear();
    }
};

/**
 * Coverage utilities
 */
export const CoverageUtils = {
    /**
     * Ensure all code paths are tested
     */
    ensureCodePaths(testCases, testFunction) {
        for (const testCase of testCases) {
            testFunction(testCase);
        }
    },

    /**
     * Test error scenarios
     */
    async testErrorScenarios(scenarios, testFunction) {
        for (const scenario of scenarios) {
            try {
                await testFunction(scenario);
            } catch (error) {
                expect(error.message).toContain(scenario.expectedError);
            }
        }
    }
};

// Global test setup and teardown
beforeEach(() => {
    TestUtils.setupTestEnvironment();
});

afterEach(() => {
    TestUtils.cleanupTestEnvironment();
});

// Export for use in test files
export default {
    TestDataFactory,
    createMockGDPRValidator,
    TestUtils,
    CoverageUtils
};
