// src/config/config.ts - Configuration Management System
// Centralized configuration management for DuoPlus Admin System

import type { DuoPlusConfig, EnvironmentConfig } from "./environment";

export class ConfigManager {
  private static instance: ConfigManager;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  private loadConfiguration(): EnvironmentConfig {
    const environment = (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test';
    
    return {
      duoplus: {
        // Server Configuration
        port: parseInt(Bun.env.DUOPLUS_ADMIN_PORT || '3227'),
        host: Bun.env.DUOPLUS_API_HOST || 'localhost',
        dbPath: Bun.env.DUOPLUS_DB_PATH || './data/duoplus.db',
        
        // KYC Configuration
        kyc: {
          provider: Bun.env.DUOPLUS_KYC_PROVIDER || 'mock',
          apiKey: Bun.env.DUOPLUS_KYC_API_KEY || '',
          webhookSecret: Bun.env.DUOPLUS_KYC_WEBHOOK_SECRET || '',
        },
        
        // Lightning Network Configuration
        lightning: {
          endpoint: Bun.env.DUOPLUS_LIGHTNING_ENDPOINT || 'https://api.lightning.network',
          macaroon: Bun.env.DUOPLUS_LIGHTNING_MACAROON || '',
          certPath: Bun.env.DUOPLUS_LIGHTNING_CERT_PATH || './certs/lightning.pem',
        },
        
        // S3 Configuration
        s3: {
          bucket: Bun.env.DUOPLUS_S3_BUCKET || 'duoplus-cache',
          region: Bun.env.DUOPLUS_S3_REGION || 'us-east-1',
          accessKey: Bun.env.DUOPLUS_S3_ACCESS_KEY || '',
          secretKey: Bun.env.DUOPLUS_S3_SECRET_KEY || '',
        },
        
        // Security Configuration
        security: {
          jwtSecret: Bun.env.DUOPLUS_JWT_SECRET || 'default-secret-change-in-production',
          jwtExpiry: parseInt(Bun.env.DUOPLUS_JWT_EXPIRY || '300'),
          sessionTimeout: parseInt(Bun.env.DUOPLUS_ADMIN_SESSION_TIMEOUT || '3600'),
        },
        
        // Performance Configuration
        performance: {
          cacheTTL: parseInt(Bun.env.DUOPLUS_CACHE_TTL || '300'),
          maxConcurrentRebalancing: parseInt(Bun.env.DUOPLUS_MAX_CONCURRENT_REBALANCING || '5'),
          apyRefreshInterval: parseInt(Bun.env.DUOPLUS_APY_REFRESH_INTERVAL || '60'),
        },
        
        // Logging Configuration
        logging: {
          level: (Bun.env.DUOPLUS_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
          logFile: Bun.env.DUOPLUS_LOG_FILE || './logs/duoplus.log',
          auditRetentionDays: parseInt(Bun.env.DUOPLUS_AUDIT_RETENTION_DAYS || '90'),
        },
        
        // Feature Flags
        features: {
          aiRiskPrediction: Bun.env.DUOPLUS_ENABLE_AI_RISK_PREDICTION === 'true',
          familyControls: Bun.env.DUOPLUS_ENABLE_FAMILY_CONTROLS === 'true',
          cashAppPriority: Bun.env.DUOPLUS_ENABLE_CASH_APP_PRIORITY === 'true',
        },
        
        // Environment Settings
        environment,
        debug: Bun.env.DUOPLUS_DEBUG === 'true',
        metricsEnabled: Bun.env.DUOPLUS_METRICS_ENABLED !== 'false',
      },
      
      bun: {
        verboseFetch: Bun.env.BUN_CONFIG_VERBOSE_FETCH !== '0',
        cachePath: Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || './.bun-cache',
        doNotTrack: Bun.env.DO_NOT_TRACK === '1',
      },
    };
  }

  /**
   * Get the complete configuration
   */
  public getConfig(): EnvironmentConfig {
    return this.config;
  }

  /**
   * Get DuoPlus specific configuration
   */
  public getDuoPlusConfig(): DuoPlusConfig {
    return this.config.duoplus;
  }

  /**
   * Get environment-specific configuration
   */
  public getEnvironmentConfig() {
    return {
      environment: this.config.duoplus.environment,
      debug: this.config.duoplus.debug,
      metricsEnabled: this.config.duoplus.metricsEnabled,
    };
  }

  /**
   * Check if a feature is enabled
   */
  public isFeatureEnabled(feature: keyof DuoPlusConfig['features']): boolean {
    return this.config.duoplus.features[feature];
  }

  /**
   * Get database configuration
   */
  public getDatabaseConfig() {
    return {
      path: this.config.duoplus.dbPath,
      encryption: {
        enabled: this.config.duoplus.environment === 'production',
        key: Bun.env.DUOPLUS_DB_ENCRYPTION_KEY,
      },
    };
  }

  /**
   * Get API configuration
   */
  public getAPIConfig() {
    return {
      port: this.config.duoplus.port,
      host: this.config.duoplus.host,
      rateLimit: parseInt(Bun.env.DUOPLUS_API_RATE_LIMIT || '1000'),
      cors: {
        origin: this.config.duoplus.environment === 'production' 
          ? ['https://duoplus.com'] 
          : ['http://localhost:3000', 'http://localhost:3227'],
        credentials: true,
      },
    };
  }

  /**
   * Validate configuration and throw errors for critical issues
   */
  public validateConfiguration(): void {
    const config = this.config.duoplus;
    
    // Validate production requirements
    if (config.environment === 'production') {
      if (config.security.jwtSecret === 'default-secret-change-in-production') {
        throw new Error('JWT_SECRET must be set in production');
      }
      
      if (config.kyc.apiKey === '') {
        throw new Error('KYC_API_KEY must be set in production');
      }
      
      if (config.s3.accessKey === '' || config.s3.secretKey === '') {
        throw new Error('S3 credentials must be set in production');
      }
    }
    
    // Validate feature dependencies
    if (config.features.aiRiskPrediction && !config.metricsEnabled) {

    }
    
    // Validate paths
    if (!config.dbPath) {
      throw new Error('Database path must be specified');
    }

  }

  /**
   * Reload configuration from environment variables
   */
  public reloadConfiguration(): void {
    this.config = this.loadConfiguration();
    this.validateConfiguration();

  }

  /**
   * Get configuration summary for debugging
   */
  public getConfigSummary(): object {
    const config = this.config.duoplus;
    
    return {
      environment: config.environment,
      port: config.port,
      features: config.features,
      performance: config.performance,
      logging: config.logging,
      debug: config.debug,
      metricsEnabled: config.metricsEnabled,
    };
  }
}

// Export singleton instance
export const config = ConfigManager.getInstance();
