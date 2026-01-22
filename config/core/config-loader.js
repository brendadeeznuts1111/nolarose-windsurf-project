#!/usr/bin/env bun

// config/config-loader.js - TOML Configuration Loader
// Loads and validates TOML configuration files for modular adapter

import { readFileSync } from 'fs';
import { resolve } from 'path';

console.log("⚙️ Configuration Loader - Loaded");

/**
 * Configuration Loader for TOML-based module configuration
 * 
 * Handles loading, validation, and merging of TOML configurations:
 * - TOML file parsing and loading
 * - Environment variable substitution
 * - Configuration validation and defaults
 * - Hot reloading support
 */

// Default configuration
const DEFAULT_CONFIG = {
    cashApp: {
        clientId: null,
        clientSecret: null,
        redirectUri: 'http://localhost:3000/callback',
        scope: 'wallet:read wallet:write',
        tokenExpiry: 3600,
        stateExpiry: 600
    },
    plaid: {
        clientId: null,
        secret: null,
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

/**
 * Load configuration from TOML files and environment
 */
export async function loadConfig(configPath = './config') {
    try {
        console.log('📋 Loading configuration...');
        
        // Load base configuration
        const config = { ...DEFAULT_CONFIG };
        
        // Load TOML configurations
        const tomlConfig = await loadTOMLConfigs(configPath);
        
        // Merge configurations
        mergeConfig(config, tomlConfig);
        
        // Apply environment variable substitutions
        applyEnvironmentSubstitutions(config);
        
        // Validate final configuration
        validateConfig(config);
        
        console.log('✅ Configuration loaded and validated');
        
        return config;
        
    } catch (error) {
        console.error('❌ Configuration loading failed:', error);
        throw error;
    }
}

/**
 * Load TOML configuration files
 */
async function loadTOMLConfigs(configPath) {
    const configs = {};
    
    try {
        // Load main configuration
        const mainConfigPath = resolve(configPath, 'config.toml');
        const mainConfig = await loadTOMLFile(mainConfigPath);
        Object.assign(configs, mainConfig);
        
        // Load environment-specific configuration
        const env = process.env.NODE_ENV || 'development';
        const envConfigPath = resolve(configPath, `${env}.toml`);
        const envConfig = await loadTOMLFile(envConfigPath);
        mergeConfig(configs, envConfig);
        
        // Load local overrides
        const localConfigPath = resolve(configPath, 'local.toml');
        const localConfig = await loadTOMLFile(localConfigPath);
        mergeConfig(configs, localConfig);
        
        console.log(`📁 Loaded TOML configs: config.toml, ${env}.toml, local.toml`);
        
    } catch (error) {
        console.warn('⚠️ TOML config loading failed, using defaults:', error.message);
    }
    
    return configs;
}

/**
 * Load a single TOML file
 */
async function loadTOMLFile(filePath) {
    try {
        const content = readFileSync(filePath, 'utf-8');
        
        // Simple TOML parser (in production, use a proper TOML library)
        const parsed = parseTOML(content);
        
        console.log(`📄 Loaded TOML file: ${filePath}`);
        
        return parsed;
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.log(`📄 TOML file not found: ${filePath} (using defaults)`);
            return {};
        }
        throw error;
    }
}

/**
 * Simple TOML parser (simplified implementation)
 */
function parseTOML(content) {
    const config = {};
    const lines = content.split('\n');
    let currentSection = config;
    
    for (const line of lines) {
        const trimmed = line.trim();
        
        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }
        
        // Section headers
        const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
        if (sectionMatch) {
            const section = sectionMatch[1];
            const sectionParts = section.split('.');
            
            // Navigate to nested section
            currentSection = config;
            for (const part of sectionParts) {
                if (!currentSection[part]) {
                    currentSection[part] = {};
                }
                currentSection = currentSection[part];
            }
            continue;
        }
        
        // Key-value pairs
        const keyValueMatch = trimmed.match(/^([^=]+)\s*=\s*(.+)$/);
        if (keyValueMatch) {
            const key = keyValueMatch[1].trim();
            let value = keyValueMatch[2].trim();
            
            // Remove quotes from strings
            if ((value.startsWith('"') && value.endsWith('"')) || 
                (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1);
            } else {
                // Parse other value types
                value = parseValue(value);
            }
            
            currentSection[key] = value;
        }
    }
    
    return config;
}

/**
 * Parse TOML value
 */
function parseValue(value) {
    // Boolean
    if (value === 'true') return true;
    if (value === 'false') return false;
    
    // Number
    if (/^\d+$/.test(value)) return parseInt(value, 10);
    if (/^\d+\.\d+$/.test(value)) return parseFloat(value);
    
    // Array
    if (value.startsWith('[') && value.endsWith(']')) {
        const arrayContent = value.slice(1, -1);
        if (!arrayContent.trim()) return [];
        
        return arrayContent.split(',').map(item => {
            const trimmed = item.trim();
            if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || 
                (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
                return trimmed.slice(1, -1);
            }
            return parseValue(trimmed);
        });
    }
    
    return value;
}

/**
 * Merge configuration objects
 */
function mergeConfig(target, source) {
    for (const [key, value] of Object.entries(source)) {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            if (!target[key] || typeof target[key] !== 'object') {
                target[key] = {};
            }
            mergeConfig(target[key], value);
        } else {
            target[key] = value;
        }
    }
}

/**
 * Apply environment variable substitutions
 */
function applyEnvironmentSubstitutions(config) {
    const envPattern = /\$\{([^}]+)\}/g;
    
    function substitute(obj) {
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                obj[key] = value.replace(envPattern, (match, envVar) => {
                    const [varName, defaultValue] = envVar.split(':');
                    return process.env[varName] || defaultValue || match;
                });
            } else if (value && typeof value === 'object' && !Array.isArray(value)) {
                substitute(value);
            }
        }
    }
    
    substitute(config);
    console.log('🔄 Applied environment variable substitutions');
}

/**
 * Validate configuration
 */
function validateConfig(config) {
    const errors = [];
    
    // Validate Cash App configuration
    if (!config.cashApp.clientId) {
        errors.push('Cash App client ID is required');
    }
    
    if (!config.cashApp.clientSecret) {
        errors.push('Cash App client secret is required');
    }
    
    // Validate Plaid configuration
    if (!config.plaid.clientId) {
        errors.push('Plaid client ID is required');
    }
    
    if (!config.plaid.secret) {
        errors.push('Plaid secret is required');
    }
    
    // Validate verifier thresholds
    const thresholds = [
        'fuzzyThreshold',
        'phoneMatchThreshold',
        'emailMatchThreshold',
        'nameMatchThreshold'
    ];
    
    for (const threshold of thresholds) {
        const value = config.verifier[threshold];
        if (typeof value !== 'number' || value < 0 || value > 1) {
            errors.push(`${threshold} must be a number between 0 and 1`);
        }
    }
    
    // Validate performance settings
    if (config.performance.cacheSize < 0) {
        errors.push('Cache size must be non-negative');
    }
    
    if (config.performance.cacheTTL < 0) {
        errors.push('Cache TTL must be non-negative');
    }
    
    if (errors.length > 0) {
        throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    console.log('✅ Configuration validation passed');
}

/**
 * Get configuration summary
 */
export function getConfigSummary(config) {
    return {
        cashApp: {
            hasClientId: !!config.cashApp.clientId,
            hasClientSecret: !!config.cashApp.clientSecret,
            redirectUri: config.cashApp.redirectUri,
            scope: config.cashApp.scope
        },
        plaid: {
            hasClientId: !!config.plaid.clientId,
            hasSecret: !!config.plaid.secret,
            environment: config.plaid.env,
            products: config.plaid.products
        },
        verifier: {
            fuzzyThreshold: config.verifier.fuzzyThreshold,
            adaptiveRouting: config.verifier.enableAdaptiveRouting,
            conflictDetection: config.verifier.conflictDetection,
            manualReviewThreshold: config.verifier.manualReviewThreshold
        },
        logging: {
            level: config.logging.level,
            enableMetrics: config.logging.enableMetrics,
            maskPII: config.logging.maskPII
        },
        performance: {
            enableCaching: config.performance.enableCaching,
            cacheSize: config.performance.cacheSize,
            enableMetrics: config.performance.enableMetrics
        }
    };
}

/**
 * Reload configuration
 */
export async function reloadConfig(configPath = './config') {
    console.log('🔄 Reloading configuration...');
    
    try {
        const newConfig = await loadConfig(configPath);
        console.log('✅ Configuration reloaded successfully');
        return newConfig;
        
    } catch (error) {
        console.error('❌ Configuration reload failed:', error);
        throw error;
    }
}

/**
 * Create sample TOML configuration files
 */
export function createSampleConfigs(configPath = './config') {
    const fs = require('fs');
    const path = require('path');
    
    // Ensure config directory exists
    if (!fs.existsSync(configPath)) {
        fs.mkdirSync(configPath, { recursive: true });
    }
    
    // Main configuration
    const mainConfig = `
# Cash App Configuration
[cashApp]
clientId = "\${CASH_APP_CLIENT_ID}"
clientSecret = "\${CASH_APP_CLIENT_SECRET}"
redirectUri = "http://localhost:3000/callback"
scope = "wallet:read wallet:write"
tokenExpiry = 3600
stateExpiry = 600

# Plaid Configuration
[plaid]
clientId = "\${PLAID_CLIENT_ID}"
secret = "\${PLAID_SECRET}"
env = "sandbox"
products = ["auth", "transactions"]
countryCodes = ["US"]
language = "en"
webhook = "\${PLAID_WEBHOOK}"
cacheExpiry = 1800

# Verification Configuration
[verifier]
fuzzyThreshold = 0.8
phoneMatchThreshold = 0.9
emailMatchThreshold = 0.85
nameMatchThreshold = 0.75
verificationExpiry = 86400000
maxRetries = 3

# Routing Configuration
[verifier.routing]
enableAdaptiveRouting = true
conflictDetection = true
manualReviewThreshold = 70
queueHighRisk = true
escalationThreshold = 85

# Performance Configuration
[verifier.performance]
maxResponseTime = 5000
maxQueueSize = 1000
retryAttempts = 3

# Logging Configuration
[logging]
level = "info"
enableMetrics = true
enableTracing = true
maskPII = true
logToFile = false
logDirectory = "./logs"

# Performance Configuration
[performance]
enableCaching = true
cacheSize = 1000
cacheTTL = 3600000
enableCompression = true
enableMetrics = true
metricsInterval = 60000
`;
    
    // Development configuration
    const devConfig = `
# Development Overrides
[logging]
level = "debug"
logToFile = true

[performance]
enableCaching = false

[verifier]
fuzzyThreshold = 0.7
manualReviewThreshold = 60
`;
    
    // Production configuration
    const prodConfig = `
# Production Overrides
[logging]
level = "warn"
logToFile = true

[performance]
enableCaching = true
cacheSize = 5000

[verifier]
fuzzyThreshold = 0.9
manualReviewThreshold = 80
`;
    
    // Write configuration files
    fs.writeFileSync(path.join(configPath, 'config.toml'), mainConfig.trim());
    fs.writeFileSync(path.join(configPath, 'development.toml'), devConfig.trim());
    fs.writeFileSync(path.join(configPath, 'production.toml'), prodConfig.trim());
    
    // Create local template
    const localTemplate = `
# Local Configuration Override
# Copy this file to local.toml and modify for your environment
[cashApp]
clientId = "your_cash_app_client_id"
clientSecret = "your_cash_app_client_secret"

[plaid]
clientId = "your_plaid_client_id"
secret = "your_plaid_secret"
webhook = "https://your-domain.com/webhook"
`;
    
    fs.writeFileSync(path.join(configPath, 'local.toml.template'), localTemplate.trim());
    
    console.log(`📁 Created sample TOML configurations in ${configPath}`);
    console.log('   📄 config.toml - Main configuration');
    console.log('   📄 development.toml - Development overrides');
    console.log('   📄 production.toml - Production overrides');
    console.log('   📄 local.toml.template - Local configuration template');
}

export default {
    loadConfig,
    getConfigSummary,
    reloadConfig,
    createSampleConfigs
};
