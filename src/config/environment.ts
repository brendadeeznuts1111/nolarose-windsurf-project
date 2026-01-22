// src/config/environment.ts - TypeScript Environment Interfaces
// Type-safe environment variable configuration for DuoPlus Admin System

declare module "bun" {
  interface Env {
    // DuoPlus Admin System Configuration
    DUOPLUS_ADMIN_PORT: string;
    DUOPLUS_API_HOST: string;
    DUOPLUS_DB_PATH: string;
    
    // KYC Configuration
    DUOPLUS_KYC_PROVIDER: string;
    DUOPLUS_KYC_API_KEY: string;
    DUOPLUS_KYC_WEBHOOK_SECRET: string;
    
    // Lightning Network Configuration
    DUOPLUS_LIGHTNING_ENDPOINT: string;
    DUOPLUS_LIGHTNING_MACAROON: string;
    DUOPLUS_LIGHTNING_CERT_PATH: string;
    
    // S3 Configuration
    DUOPLUS_S3_BUCKET: string;
    DUOPLUS_S3_REGION: string;
    DUOPLUS_S3_ACCESS_KEY: string;
    DUOPLUS_S3_SECRET_KEY: string;
    
    // Security Configuration
    DUOPLUS_JWT_SECRET: string;
    DUOPLUS_JWT_EXPIRY: string;
    DUOPLUS_ADMIN_SESSION_TIMEOUT: string;
    
    // Performance Configuration
    DUOPLUS_CACHE_TTL: string;
    DUOPLUS_MAX_CONCURRENT_REBALANCING: string;
    DUOPLUS_APY_REFRESH_INTERVAL: string;
    
    // Logging Configuration
    DUOPLUS_LOG_LEVEL: string;
    DUOPLUS_LOG_FILE: string;
    DUOPLUS_AUDIT_RETENTION_DAYS: string;
    
    // Development/Production Settings
    DUOPLUS_DEBUG: string;
    DUOPLUS_METRICS_ENABLED: string;
    
    // Feature Flags
    DUOPLUS_ENABLE_AI_RISK_PREDICTION: string;
    DUOPLUS_ENABLE_FAMILY_CONTROLS: string;
    DUOPLUS_ENABLE_CASH_APP_PRIORITY: string;
  }
}

export interface DuoPlusConfig {
  // Server Configuration
  port: number;
  host: string;
  dbPath: string;
  
  // KYC Configuration
  kyc: {
    provider: string;
    apiKey: string;
    webhookSecret: string;
  };
  
  // Lightning Network Configuration
  lightning: {
    endpoint: string;
    macaroon: string;
    certPath: string;
  };
  
  // S3 Configuration
  s3: {
    bucket: string;
    region: string;
    accessKey: string;
    secretKey: string;
  };
  
  // Security Configuration
  security: {
    jwtSecret: string;
    jwtExpiry: number;
    sessionTimeout: number;
  };
  
  // Performance Configuration
  performance: {
    cacheTTL: number;
    maxConcurrentRebalancing: number;
    apyRefreshInterval: number;
  };
  
  // Logging Configuration
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    logFile: string;
    auditRetentionDays: number;
  };
  
  // Feature Flags
  features: {
    aiRiskPrediction: boolean;
    familyControls: boolean;
    cashAppPriority: boolean;
  };
  
  // Environment Settings
  environment: 'development' | 'production' | 'test';
  debug: boolean;
  metricsEnabled: boolean;
}

export interface EnvironmentConfig {
  duoplus: DuoPlusConfig;
  bun: {
    verboseFetch: boolean;
    cachePath: string;
    doNotTrack: boolean;
  };
}
