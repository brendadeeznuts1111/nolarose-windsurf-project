import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

export interface DeploymentConfig {
  environment: string;
  region: string;
  cluster: string;
  namespace: string;
  services: ServiceDeployment[];
  databases: DatabaseConfig[];
  monitoring: MonitoringConfig;
  security: SecurityConfig;
}

export interface ServiceDeployment {
  name: string;
  image: string;
  port: number;
  replicas: number;
  resources: ResourceConfig;
  environment: Record<string, string>;
  healthCheck: HealthCheckConfig;
}

export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'redis';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
  backup: BackupConfig;
}

export interface ResourceConfig {
  cpu: string;
  memory: string;
  storage: string;
}

export interface HealthCheckConfig {
  path: string;
  interval: number;
  timeout: number;
  retries: number;
}

export interface MonitoringConfig {
  enabled: boolean;
  prometheus: boolean;
  grafana: boolean;
  loki: boolean;
  jaeger: boolean;
}

export interface SecurityConfig {
  tls: boolean;
  authentication: boolean;
  authorization: boolean;
  encryption: boolean;
  audit: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  schedule: string;
  retention: number;
  storage: string;
}

export class DeploymentManager {
  private static instance: DeploymentManager;
  private configPath: string;
  private currentConfig: DeploymentConfig | null = null;

  private constructor() {
    this.configPath = resolve(process.cwd(), 'config', 'deployment');
  }

  public static getInstance(): DeploymentManager {
    if (!DeploymentManager.instance) {
      DeploymentManager.instance = new DeploymentManager();
    }
    return DeploymentManager.instance;
  }

  public loadDeployment(environment: string): DeploymentConfig {
    const configFile = resolve(this.configPath, `${environment}.json`);
    
    if (!existsSync(configFile)) {
      throw new Error(`Deployment configuration not found: ${environment}`);
    }

    try {
      const content = readFileSync(configFile, 'utf-8');
      this.currentConfig = JSON.parse(content);
      if (!this.currentConfig) {
        throw new Error('Configuration is null or empty');
      }
      return this.currentConfig;
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to load deployment config for ${environment}: ${errorMessage}`);
    }
  }

  public saveDeployment(config: DeploymentConfig, environment: string): void {
    const configFile = resolve(this.configPath, `${environment}.json`);
    const content = JSON.stringify(config, null, 2);
    
    writeFileSync(configFile, content);
    this.currentConfig = config;
    console.log(`✅ Deployment configuration saved for ${environment}`);
  }

  public createDeploymentTemplate(environment: string): DeploymentConfig {
    const template: DeploymentConfig = {
      environment,
      region: 'us-east-1',
      cluster: 'windsurf-cluster',
      namespace: 'windsurf',
      services: [
        {
          name: 'main-api',
          image: 'nolarose/windsurf-main-api:latest',
          port: 3000,
          replicas: 3,
          resources: {
            cpu: '500m',
            memory: '512Mi',
            storage: '1Gi'
          },
          environment: {
            NODE_ENV: environment,
            PORT: '3000'
          },
          healthCheck: {
            path: '/health',
            interval: 30,
            timeout: 10,
            retries: 3
          }
        },
        {
          name: 'risk-analysis',
          image: 'nolarose/windsurf-risk-analysis:latest',
          port: 3001,
          replicas: 2,
          resources: {
            cpu: '1000m',
            memory: '1Gi',
            storage: '2Gi'
          },
          environment: {
            NODE_ENV: environment,
            PORT: '3001'
          },
          healthCheck: {
            path: '/api/risk/health',
            interval: 30,
            timeout: 10,
            retries: 3
          }
        },
        {
          name: 'ai-prediction',
          image: 'nolarose/windsurf-ai-prediction:latest',
          port: 3002,
          replicas: 2,
          resources: {
            cpu: '2000m',
            memory: '2Gi',
            storage: '4Gi'
          },
          environment: {
            NODE_ENV: environment,
            PORT: '3002'
          },
          healthCheck: {
            path: '/api/ai/health',
            interval: 30,
            timeout: 15,
            retries: 3
          }
        }
      ],
      databases: [
        {
          type: 'postgresql',
          host: 'postgres-primary',
          port: 5432,
          database: 'windsurf',
          username: 'windsurf_user',
          password: '${DB_PASSWORD}',
          ssl: true,
          backup: {
            enabled: true,
            schedule: '0 2 * * *',
            retention: 30,
            storage: 's3://windsurf-backups'
          }
        },
        {
          type: 'redis',
          host: 'redis-cluster',
          port: 6379,
          database: 'redis_cache_0',
          username: '',
          password: '${REDIS_PASSWORD}',
          ssl: true,
          backup: {
            enabled: true,
            schedule: '0 3 * * *',
            retention: 7,
            storage: 's3://windsurf-backups'
          }
        }
      ],
      monitoring: {
        enabled: true,
        prometheus: true,
        grafana: true,
        loki: true,
        jaeger: true
      },
      security: {
        tls: true,
        authentication: true,
        authorization: true,
        encryption: true,
        audit: true
      }
    };

    this.saveDeployment(template, environment);
    return template;
  }

  public deploy(config: DeploymentConfig, options: { dryRun?: boolean; force?: boolean } = {}): void {
    console.log(`🚀 Deploying to ${config.environment}...`);
    
    if (options.dryRun) {
      console.log('🔍 Dry run mode - no actual deployment');
      console.log(JSON.stringify(config, null, 2));
      return;
    }

    // Validate configuration
    this.validateDeployment(config);

    // Generate Kubernetes manifests
    this.generateKubernetesManifests(config);

    // Apply manifests
    if (!options.dryRun) {
      this.applyKubernetesManifests(config);
    }

    console.log(`✅ Deployment to ${config.environment} completed`);
  }

  public rollback(environment: string, version: string): void {
    console.log(`🔄 Rolling back ${environment} to version ${version}...`);
    
    try {
      execSync(`kubectl rollout undo deployment/windsurf-main-api -n windsurf-${environment}`, { stdio: 'inherit' });
      execSync(`kubectl rollout undo deployment/windsurf-risk-analysis -n windsurf-${environment}`, { stdio: 'inherit' });
      execSync(`kubectl rollout undo deployment/windsurf-ai-prediction -n windsurf-${environment}`, { stdio: 'inherit' });
      
      console.log(`✅ Rollback to ${version} completed`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Rollback failed: ${errorMessage}`);
      throw error;
    }
  }

  public getStatus(environment: string): any {
    try {
      const namespace = `windsurf-${environment}`;
      const output = execSync(`kubectl get pods -n ${namespace} -o json`, { encoding: 'utf-8' });
      const data = JSON.parse(output);
      
      return {
        environment,
        namespace,
        pods: data.items?.map((pod: any) => ({
          name: pod.metadata?.name || 'unknown',
          status: pod.status?.phase || 'unknown',
          ready: pod.status?.containerStatuses?.[0]?.ready || false,
          restarts: pod.status?.containerStatuses?.[0]?.restartCount || 0,
          age: this.calculateAge(pod.metadata?.creationTimestamp || '')
        })) || []
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to get status for ${environment}: ${errorMessage}`);
      return null;
    }
  }

  public scale(environment: string, service: string, replicas: number): void {
    console.log(`📊 Scaling ${service} in ${environment} to ${replicas} replicas...`);
    
    try {
      execSync(`kubectl scale deployment ${service} --replicas=${replicas} -n windsurf-${environment}`, { stdio: 'inherit' });
      console.log(`✅ Scaling completed`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Scaling failed: ${errorMessage}`);
      throw error;
    }
  }

  public getLogs(environment: string, service: string, options: { follow?: boolean; tail?: number } = {}): void {
    const namespace = `windsurf-${environment}`;
    let command = `kubectl logs deployment/${service} -n ${namespace}`;
    
    if (options.follow) {
      command += ' -f';
    }
    
    if (options.tail) {
      command += ` --tail=${options.tail}`;
    }
    
    try {
      execSync(command, { stdio: 'inherit' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to get logs: ${errorMessage}`);
    }
  }

  private validateDeployment(config: DeploymentConfig): void {
    if (!config.environment) {
      throw new Error('Environment name is required');
    }
    
    if (!config.services || config.services.length === 0) {
      throw new Error('At least one service must be defined');
    }
    
    for (const service of config.services) {
      if (!service.name || !service.image || !service.port) {
        throw new Error(`Service ${service.name} is missing required fields`);
      }
    }
  }

  private generateKubernetesManifests(config: DeploymentConfig): void {
    const manifestDir = resolve(this.configPath, 'manifests', config.environment);
    
    // Create manifest directory
    execSync(`mkdir -p ${manifestDir}`, { stdio: 'inherit' });
    
    // Generate namespace
    this.generateNamespaceManifest(config, manifestDir);
    
    // Generate services
    for (const service of config.services) {
      this.generateServiceManifest(service, config, manifestDir);
    }
    
    // Generate configmaps and secrets
    this.generateConfigMaps(config, manifestDir);
    this.generateSecrets(config, manifestDir);
  }

  private generateNamespaceManifest(config: DeploymentConfig, manifestDir: string): void {
    const namespace = {
      apiVersion: 'v1',
      kind: 'Namespace',
      metadata: {
        name: `windsurf-${config.environment}`,
        labels: {
          environment: config.environment,
          project: 'windsurf'
        }
      }
    };
    
    writeFileSync(resolve(manifestDir, 'namespace.yaml'), JSON.stringify(namespace, null, 2));
  }

  private generateServiceManifest(service: ServiceDeployment, config: DeploymentConfig, manifestDir: string): void {
    const deployment = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: service.name,
        namespace: `windsurf-${config.environment}`,
        labels: {
          app: service.name,
          environment: config.environment
        }
      },
      spec: {
        replicas: service.replicas,
        selector: {
          matchLabels: {
            app: service.name
          }
        },
        template: {
          metadata: {
            labels: {
              app: service.name
            }
          },
          spec: {
            containers: [
              {
                name: service.name,
                image: service.image,
                ports: [
                  {
                    containerPort: service.port
                  }
                ],
                resources: {
                  requests: {
                    cpu: service.resources.cpu,
                    memory: service.resources.memory
                  },
                  limits: {
                    cpu: service.resources.cpu,
                    memory: service.resources.memory
                  }
                },
                env: Object.entries(service.environment).map(([key, value]) => ({
                  name: key,
                  value: value
                })),
                livenessProbe: {
                  httpGet: {
                    path: service.healthCheck.path,
                    port: service.port
                  },
                  initialDelaySeconds: 30,
                  periodSeconds: service.healthCheck.interval
                },
                readinessProbe: {
                  httpGet: {
                    path: service.healthCheck.path,
                    port: service.port
                  },
                  initialDelaySeconds: 5,
                  periodSeconds: 5
                }
              }
            ]
          }
        }
      }
    };
    
    writeFileSync(resolve(manifestDir, `${service.name}-deployment.yaml`), JSON.stringify(deployment, null, 2));
  }

  private generateConfigMaps(config: DeploymentConfig, manifestDir: string): void {
    const configMap = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'windsurf-config',
        namespace: `windsurf-${config.environment}`
      },
      data: {
        'environment': config.environment,
        'region': config.region,
        'cluster': config.cluster
      }
    };
    
    writeFileSync(resolve(manifestDir, 'configmap.yaml'), JSON.stringify(configMap, null, 2));
  }

  private generateSecrets(config: DeploymentConfig, manifestDir: string): void {
    const secret = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'windsurf-secrets',
        namespace: `windsurf-${config.environment}`
      },
      type: 'Opaque',
      data: {
        // Base64 encoded values would go here
        'db-password': 'dGVtcC1wYXNzd29yZA==', // temp-password
        'redis-password': 'dGVtcC1yZWRpcy1wYXNz', // temp-redis-pass
        'jwt-secret': 'dGVtcC1qd3Qtc2VjcmV0' // temp-jwt-secret
      }
    };
    
    writeFileSync(resolve(manifestDir, 'secrets.yaml'), JSON.stringify(secret, null, 2));
  }

  private applyKubernetesManifests(config: DeploymentConfig): void {
    const manifestDir = resolve(this.configPath, 'manifests', config.environment);
    
    try {
      execSync(`kubectl apply -f ${manifestDir}`, { stdio: 'inherit' });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to apply manifests: ${errorMessage}`);
      throw error;
    }
  }

  private calculateAge(creationTimestamp: string): string {
    if (!creationTimestamp) return 'unknown';
    
    const created = new Date(creationTimestamp);
    const now = new Date();
    const diff = now.getTime() - created.getTime();
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }
}

// CLI interface
export async function main() {
  const deploymentManager = DeploymentManager.getInstance();
  const command = process.argv[2];
  const environment = process.argv[3];

  switch (command) {
    case 'init':
      if (!environment) {
        console.error('Error: Environment name required');
        process.exit(1);
      }
      try {
        deploymentManager.createDeploymentTemplate(environment);
        console.log(`✅ Deployment template created for ${environment}`);
      } catch (error) {
        console.error(`Error creating template: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'deploy':
      if (!environment) {
        console.error('Error: Environment name required');
        process.exit(1);
      }
      try {
        const config = deploymentManager.loadDeployment(environment);
        const dryRun = process.argv.includes('--dry-run');
        deploymentManager.deploy(config, { dryRun });
      } catch (error) {
        console.error(`Error deploying: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'status':
      if (!environment) {
        console.error('Error: Environment name required');
        process.exit(1);
      }
      try {
        const status = deploymentManager.getStatus(environment);
        if (status) {
          console.table(status.pods);
        }
      } catch (error) {
        console.error(`Error getting status: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'scale':
      if (!environment || !process.argv[4] || !process.argv[5]) {
        console.error('Error: Environment, service, and replica count required');
        process.exit(1);
      }
      try {
        const service = process.argv[4];
        const replicas = parseInt(process.argv[5], 10);
        deploymentManager.scale(environment, service, replicas);
      } catch (error) {
        console.error(`Error scaling: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'logs':
      if (!environment || !process.argv[4]) {
        console.error('Error: Environment and service name required');
        process.exit(1);
      }
      try {
        const service = process.argv[4];
        const follow = process.argv.includes('--follow');
        const tail = process.argv.includes('--tail') ? parseInt(process.argv[process.argv.indexOf('--tail') + 1], 10) : undefined;
        deploymentManager.getLogs(environment, service, { follow, tail });
      } catch (error) {
        console.error(`Error getting logs: ${error.message}`);
        process.exit(1);
      }
      break;

    case 'rollback':
      if (!environment || !process.argv[4]) {
        console.error('Error: Environment and version required');
        process.exit(1);
      }
      try {
        const version = process.argv[4];
        deploymentManager.rollback(environment, version);
      } catch (error) {
        console.error(`Error rolling back: ${error.message}`);
        process.exit(1);
      }
      break;

    default:
      console.log(`
Usage: bun run deployment-manager.ts <command> <environment> [options]

Commands:
  init <env>              Create deployment template for environment
  deploy <env>            Deploy to environment
  status <env>            Show deployment status
  scale <env> <svc> <n>   Scale service to n replicas
  logs <env> <svc>        Show service logs
  rollback <env> <ver>    Rollback to version

Options:
  --dry-run               Show deployment without executing
  --follow                Follow logs in real-time
  --tail <n>              Show last n log lines

Examples:
  bun run deployment-manager.ts init staging
  bun run deployment-manager.ts deploy staging --dry-run
  bun run deployment-manager.ts status production
  bun run deployment-manager.ts scale production main-api 5
  bun run deployment-manager.ts logs production main-api --follow
      `);
  }
}

// CLI interface
if (require.main === module) {
  main().catch(console.error);
}
