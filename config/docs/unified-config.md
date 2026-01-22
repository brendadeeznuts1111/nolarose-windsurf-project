# Unified Configuration System

## Environment Configuration

### Development Environment
```toml
# config/environments/development.toml
[environment]
name = "development"
debug = true
logLevel = "debug"

[database]
type = "sqlite"
path = "./data/dev.db"
poolSize = 5

[redis]
host = "localhost"
port = 6379
db = 0

[api]
timeout = 30000
retries = 3
rateLimit = 100

[features]
premium = true
debugMode = true
mockApi = true
betaFeatures = true
```

### Production Environment
```toml
# config/environments/production.toml
[environment]
name = "production"
debug = false
logLevel = "info"

[database]
type = "postgresql"
host = "${DB_HOST}"
port = "${DB_PORT}"
database = "${DB_NAME}"
username = "${DB_USER}"
password = "${DB_PASSWORD}"
poolSize = 20

[redis]
host = "${REDIS_HOST}"
port = "${REDIS_PORT}"
db = 1

[api]
timeout = 10000
retries = 5
rateLimit = 1000

[features]
premium = true
debugMode = false
mockApi = false
betaFeatures = false
```

### Testing Environment
```toml
# config/environments/testing.toml
[environment]
name = "testing"
debug = true
logLevel = "error"

[database]
type = "sqlite"
path = ":memory:"
poolSize = 1

[redis]
host = "localhost"
port = 6379
db = 2

[api]
timeout = 5000
retries = 1
rateLimit = 50

[features]
premium = true
debugMode = true
mockApi = true
betaFeatures = true
```

## Service Configuration

### Main API Service
```toml
# config/services/main-api.toml
[service]
name = "main-api"
version = "1.0.0"
port = 3000
host = "localhost"

[cashApp]
clientId = "${CASH_APP_CLIENT_ID}"
clientSecret = "${CASH_APP_CLIENT_SECRET}"
redirectUri = "http://localhost:3000/callback"
scope = "wallet:read wallet:write"
tokenExpiry = 3600
stateExpiry = 600

[plaid]
clientId = "${PLAID_CLIENT_ID}"
secret = "${PLAID_SECRET}"
env = "sandbox"
products = ["auth", "transactions"]
countryCodes = ["US"]
language = "en"
webhook = "${PLAID_WEBHOOK}"
cacheExpiry = 1800

[security]
enableCors = true
corsOrigins = ["http://localhost:3000", "http://localhost:3005"]
enableHelmet = true
enableRateLimit = true
rateLimitWindow = 60000
rateLimitMax = 100
```

### Risk Analysis Service
```toml
# config/services/risk-analysis.toml
[service]
name = "risk-analysis"
version = "1.0.0"
port = 3001
host = "localhost"

[riskScoring]
modelPath = "./models/risk-model.onnx"
threshold = 0.7
features = ["velocity", "anomaly", "device", "geo", "compliance"]
updateInterval = 300000

[tensionFields]
enabled = true
decayRate = 0.95
maxTension = 100
alertThreshold = 80

[monitoring]
enableMetrics = true
metricsInterval = 10000
enableTracing = true
traceSampleRate = 0.1
```

### AI/ML Prediction Service
```toml
# config/services/ai-prediction.toml
[service]
name = "ai-prediction"
version = "1.0.0"
port = 3002
host = "localhost"

[models]
riskModel = "./models/risk-model.onnx"
anomalyModel = "./models/anomaly-model.onnx"
deviceModel = "./models/device-model.onnx"

[inference]
batchSize = 32
timeout = 5000
maxConcurrency = 10
enableCaching = true
cacheTTL = 300000

[features]
deviceFingerprinting = true
behavioralAnalysis = true
geolocationTracking = true
complianceMonitoring = true
```

## Configuration Loader

```typescript
// config/config-loader.ts
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { parse as parseToml } from '@iarna/toml';

export interface Config {
  environment: {
    name: string;
    debug: boolean;
    logLevel: string;
  };
  database: {
    type: string;
    host?: string;
    port?: number;
    database?: string;
    username?: string;
    password?: string;
    path?: string;
    poolSize: number;
  };
  redis: {
    host: string;
    port: number;
    db: number;
  };
  api: {
    timeout: number;
    retries: number;
    rateLimit: number;
  };
  features: {
    premium: boolean;
    debugMode: boolean;
    mockApi: boolean;
    betaFeatures: boolean;
  };
}

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: Config;
  private environment: string;

  private constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  private loadConfig(): Config {
    const envConfig = this.loadEnvironmentConfig();
    const serviceConfig = this.loadServiceConfig();
    
    return {
      ...envConfig,
      ...serviceConfig
    };
  }

  private loadEnvironmentConfig(): any {
    const configPath = resolve(process.cwd(), 'config', 'environments', `${this.environment}.toml`);
    try {
      const content = readFileSync(configPath, 'utf-8');
      return parseToml(content);
    } catch (error) {
      console.error(`Failed to load environment config for ${this.environment}:`, error);
      throw error;
    }
  }

  private loadServiceConfig(): any {
    const serviceName = process.env.SERVICE_NAME || 'main-api';
    const configPath = resolve(process.cwd(), 'config', 'services', `${serviceName}.toml`);
    try {
      const content = readFileSync(configPath, 'utf-8');
      return parseToml(content);
    } catch (error) {
      console.warn(`Failed to load service config for ${serviceName}, using defaults`);
      return {};
    }
  }

  public get<T = any>(key: string): T {
    return this.getNestedValue(this.config, key);
  }

  public set(key: string, value: any): void {
    this.setNestedValue(this.config, key, value);
  }

  public getAll(): Config {
    return { ...this.config };
  }

  public reload(): void {
    this.config = this.loadConfig();
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }
}

// Export singleton instance
export const config = ConfigLoader.getInstance();
```

## Environment Variables

### Required Environment Variables
```bash
# Application
NODE_ENV=development|production|testing
SERVICE_NAME=main-api
PORT=3000

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=windsurf
DB_USER=windsurf_user
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Cash App
CASH_APP_CLIENT_ID=your_client_id
CASH_APP_CLIENT_SECRET=your_client_secret

# Plaid
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_WEBHOOK=https://your-domain.com/webhook/plaid

# Security
JWT_SECRET=your_jwt_secret
ENCRYPTION_KEY=your_encryption_key

# External Services
SENTRY_DSN=your_sentry_dsn
LOGGLY_TOKEN=your_loggly_token
```

### Optional Environment Variables
```bash
# Development
DEBUG=true
LOG_LEVEL=debug

# Performance
ENABLE_METRICS=true
ENABLE_TRACING=true
CACHE_TTL=300000

# Features
ENABLE_PREMIUM=true
ENABLE_BETA_FEATURES=true
ENABLE_MOCK_API=true

# Monitoring
HEALTH_CHECK_INTERVAL=30000
METRICS_INTERVAL=60000
```

## Configuration Validation

```typescript
// config/config-validator.ts
import { config } from './config-loader.js';
import { z } from 'zod';

const EnvironmentSchema = z.object({
  name: z.enum(['development', 'production', 'testing']),
  debug: z.boolean(),
  logLevel: z.enum(['debug', 'info', 'warn', 'error'])
});

const DatabaseSchema = z.object({
  type: z.enum(['sqlite', 'postgresql', 'mysql']),
  host: z.string().optional(),
  port: z.number().optional(),
  database: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  path: z.string().optional(),
  poolSize: z.number().min(1).max(100)
});

const RedisSchema = z.object({
  host: z.string(),
  port: z.number().min(1).max(65535),
  db: z.number().min(0).max(15)
});

export class ConfigValidator {
  static validate(): boolean {
    try {
      const configData = config.getAll();
      
      EnvironmentSchema.parse(configData.environment);
      DatabaseSchema.parse(configData.database);
      RedisSchema.parse(configData.redis);
      
      console.log('✅ Configuration validation passed');
      return true;
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      return false;
    }
  }
  
  static validateService(serviceName: string): boolean {
    try {
      const serviceConfig = config.get(`services.${serviceName}`);
      // Add service-specific validation here
      return true;
    } catch (error) {
      console.error(`❌ Service ${serviceName} validation failed:`, error);
      return false;
    }
  }
}
```

## Configuration Freeze System

```typescript
// config/config-freeze.ts
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export class ConfigFreeze {
  private static FREEZE_FILE = '.config-freeze.json';
  
  static freeze(config: any): void {
    const freezeData = {
      timestamp: new Date().toISOString(),
      config: config,
      checksum: this.calculateChecksum(config)
    };
    
    writeFileSync(this.FREEZE_FILE, JSON.stringify(freezeData, null, 2));
    console.log('🔒 Configuration frozen');
  }
  
  static unfreeze(): void {
    if (existsSync(this.FREEZE_FILE)) {
      const freezeData = JSON.parse(readFileSync(this.FREEZE_FILE, 'utf-8'));
      console.log('🔓 Configuration unfrozen');
      return freezeData.config;
    }
    return null;
  }
  
  static isFrozen(): boolean {
    return existsSync(this.FREEZE_FILE);
  }
  
  static verify(): boolean {
    if (!this.isFrozen()) return false;
    
    const freezeData = JSON.parse(readFileSync(this.FREEZE_FILE, 'utf-8'));
    const currentChecksum = this.calculateChecksum(freezeData.config);
    
    return currentChecksum === freezeData.checksum;
  }
  
  private static calculateChecksum(config: any): string {
    // Simple checksum implementation
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(config));
    return hash.digest('hex');
  }
}
```
