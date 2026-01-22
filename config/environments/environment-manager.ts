import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';
// Using built-in JSON parsing instead of @iarna/toml for now
// import { parse as parseToml } from '@iarna/toml';

// Simple TOML parser fallback
function parseToml(content: string): any {
  // This is a basic fallback - in production, install @iarna/toml
  try {
    // For now, parse as JSON with basic TOML-like structure
    const lines = content.split('\n');
    const result: any = {};
    let currentSection: any = result;
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const section = trimmed.slice(1, -1);
        if (section) {
          result[section] = {};
          currentSection = result[section];
        }
      } else if (trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          currentSection[key.trim()] = value.replace(/"/g, '');
        }
      }
    }
    
    return result;
  } catch (error) {
    console.error('TOML parsing error, falling back to basic parsing');
    return {};
  }
}
// Remove the problematic import for now
// import { config } from './config-loader.js';

export interface EnvironmentConfig {
  name: string;
  debug: boolean;
  logLevel: string;
  database: any;
  redis: any;
  api: any;
  features: any;
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private currentEnvironment: string;
  private configPath: string;

  private constructor() {
    this.currentEnvironment = process.env.NODE_ENV || 'development';
    this.configPath = resolve(process.cwd(), 'config', 'environments');
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  public loadEnvironment(env: string): EnvironmentConfig {
    const configFile = resolve(this.configPath, `${env}.toml`);
    
    if (!existsSync(configFile)) {
      throw new Error(`Environment configuration not found: ${env}`);
    }

    try {
      const content = readFileSync(configFile, 'utf-8');
      const parsed = parseToml(content);
      return this.interpolateEnvironmentVariables(parsed);
    } catch (error: any) {
      throw new Error(`Failed to load environment ${env}: ${error?.message || error}`);
    }
  }

  public switchEnvironment(env: string): void {
    const newConfig = this.loadEnvironment(env);
    
    // Validate the new environment
    this.validateEnvironment(newConfig);
    
    // Update current environment
    this.currentEnvironment = env;
    process.env.NODE_ENV = env;
    
    // Reload configuration if available
    // config.reload();
    
    console.log(`🔄 Switched to environment: ${env}`);
  }

  public getCurrentEnvironment(): string {
    return this.currentEnvironment;
  }

  public createEnvironment(env: string, baseEnv: string = 'development'): void {
    const baseConfig = this.loadEnvironment(baseEnv);
    const newConfig = { ...baseConfig, name: env };
    
    const configFile = resolve(this.configPath, `${env}.toml`);
    const content = this.formatToml(newConfig);
    
    writeFileSync(configFile, content);
    console.log(`✅ Created environment configuration: ${env}`);
  }

  public listEnvironments(): string[] {
    const environments: string[] = [];
    
    try {
      const files = require('fs').readdirSync(this.configPath);
      for (const file of files) {
        if (file.endsWith('.toml')) {
          environments.push(file.replace('.toml', ''));
        }
      }
    } catch (error) {
      console.error('Failed to list environments:', error);
    }
    
    return environments;
  }

  public validateEnvironment(envConfig: any): boolean {
    const required = ['name', 'debug', 'logLevel'];
    const env = envConfig.environment || envConfig;
    const missing = required.filter(key => !env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment fields: ${missing.join(', ')}`);
    }
    
    return true;
  }

  public exportEnvironment(env: string, format: 'json' | 'toml' | 'env' = 'json'): string {
    const envConfig = this.loadEnvironment(env);
    
    switch (format) {
      case 'json':
        return JSON.stringify(envConfig, null, 2);
      case 'toml':
        return this.formatToml(envConfig);
      case 'env':
        return this.formatEnvFile(envConfig);
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  private interpolateEnvironmentVariables(config: any): any {
    const json = JSON.stringify(config);
    const interpolated = json.replace(/\$\{([^}]+)\}/g, (match, varName) => {
      return process.env[varName] || match;
    });
    return JSON.parse(interpolated);
  }

  private formatToml(config: any): string {
    if (!config) return '';
    
    let toml = '';
    
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'object' && !Array.isArray(value)) {
        toml += `[${key}]\n`;
        for (const [subKey, subValue] of Object.entries(value)) {
          toml += `${subKey} = ${JSON.stringify(subValue)}\n`;
        }
        toml += '\n';
      } else {
        toml += `${key} = ${JSON.stringify(value)}\n`;
      }
    }
    
    return toml;
  }

  private formatEnvFile(config: any): string {
    let env = '';
    
    const flatten = (obj: any, prefix = '') => {
      if (!obj) return;
      
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}_${key.toUpperCase()}` : key.toUpperCase();
        
        if (typeof value === 'object' && !Array.isArray(value)) {
          flatten(value, fullKey);
        } else {
          env += `${fullKey}=${value}\n`;
        }
      }
    };
    
    flatten(config);
    return env;
  }
}

// CLI interface
export async function main() {
  const envManager = EnvironmentManager.getInstance();
  const command = process.argv[2];
  const environment = process.argv[3];

  switch (command) {
    case 'list':
      const environments = envManager.listEnvironments();
      console.log('Available environments:');
      environments.forEach(env => {
        const current = env === envManager.getCurrentEnvironment() ? ' (current)' : '';
        console.log(`  ${env}${current}`);
      });
      break;

    case 'switch':
      if (!environment) {
        console.error('Error: Environment name required');
        process.exit(1);
      }
      try {
        envManager.switchEnvironment(environment);
      } catch (error: any) {
        console.error(`Error switching environment: ${error?.message || error}`);
        process.exit(1);
      }
      break;

    case 'create':
      if (!environment) {
        console.error('Error: Environment name required');
        process.exit(1);
      }
      const baseEnv = process.argv[4] || 'development';
      try {
        envManager.createEnvironment(environment, baseEnv);
      } catch (error: any) {
        console.error(`Error creating environment: ${error?.message || error}`);
        process.exit(1);
      }
      break;

    case 'validate':
      const currentEnv = envManager.getCurrentEnvironment();
      try {
        const config = envManager.loadEnvironment(currentEnv);
        envManager.validateEnvironment(config);
        console.log(`✅ Environment ${currentEnv} is valid`);
      } catch (error: any) {
        console.error(`❌ Environment validation failed: ${error?.message || error}`);
        process.exit(1);
      }
      break;

    case 'export':
      const envToExport = environment || envManager.getCurrentEnvironment();
      const format = process.argv[4] as 'json' | 'toml' | 'env' || 'json';
      try {
        const exported = envManager.exportEnvironment(envToExport, format);
        console.log(exported);
      } catch (error: any) {
        console.error(`Error exporting environment: ${error?.message || error}`);
        process.exit(1);
      }
      break;

    case 'current':
      console.log(`Current environment: ${envManager.getCurrentEnvironment()}`);
      break;

    default:
      console.log(`
Usage: bun run environment-manager.ts <command> [environment] [options]

Commands:
  list                     List all available environments
  switch <env>            Switch to a different environment
  create <env> [base]     Create a new environment (defaults to development)
  validate                Validate current environment configuration
  export [env] [format]   Export environment (json|toml|env)
  current                 Show current environment

Examples:
  bun run environment-manager.ts list
  bun run environment-manager.ts switch production
  bun run environment-manager.ts create staging development
  bun run environment-manager.ts export production toml
      `);
  }
}

// CLI interface
if (require.main === module) {
  main().catch(console.error);
}
