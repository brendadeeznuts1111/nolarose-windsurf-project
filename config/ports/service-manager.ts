import { spawn, ChildProcess } from 'child_process';
import { SERVICE_REGISTRY, type ServiceConfig } from './registry.js';

export class ServiceManager {
  private processes: Map<string, ChildProcess> = new Map();
  private startupOrder: string[] = [
    'mainApi',
    'riskAnalysis', 
    'aiPrediction',
    'guardianNetwork',
    'familyControls',
    'shoppingDemo',
    'duoplusAdmin',
    'crossFamilyNetwork',
    'suspensionRisk',
    'configManagement',
    'configDashboard',
    'docsServer'
  ];

  async startService(serviceName: string, options: { port?: number; env?: Record<string, string> } = {}): Promise<void> {
    const service = SERVICE_REGISTRY[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }

    if (this.processes.has(serviceName)) {
      console.log(`⚠️  Service ${serviceName} is already running`);
      return;
    }

    const port = options.port || service.port;
    const env = { ...process.env, ...service.environment, ...options.env, PORT: port.toString() };

    console.log(`🚀 Starting ${service.name} on port ${port}...`);

    const command = this.getCommandForService(serviceName);
    const args = this.getArgsForService(serviceName);
    
    const childProcess = spawn(command, args, {
      env,
      stdio: 'inherit',
      cwd: process.cwd()
    });

    this.processes.set(serviceName, childProcess);

    childProcess.on('error', (error: unknown) => {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`❌ Failed to start ${serviceName}:`, errorMessage);
      this.processes.delete(serviceName);
    });

    childProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error(`❌ ${serviceName} exited with code ${code}`);
      } else {
        console.log(`✅ ${serviceName} stopped gracefully`);
      }
      this.processes.delete(serviceName);
    });

    // Wait for service to be ready
    await this.waitForService(serviceName, port);
    console.log(`✅ ${service.name} is ready on http://${service.host}:${port}`);
  }

  async stopService(serviceName: string): Promise<void> {
    const process = this.processes.get(serviceName);
    if (!process) {
      console.log(`⚠️  Service ${serviceName} is not running`);
      return;
    }

    console.log(`🛑 Stopping ${serviceName}...`);
    process.kill('SIGTERM');
    
    // Force kill if it doesn't stop gracefully
    setTimeout(() => {
      if (this.processes.has(serviceName)) {
        console.log(`⚡ Force killing ${serviceName}...`);
        process.kill('SIGKILL');
      }
    }, 5000);
  }

  async startAllServices(options: { parallel?: boolean } = {}): Promise<void> {
    console.log('🚀 Starting all services...');
    
    if (options.parallel) {
      // Start all services in parallel
      const promises = this.startupOrder.map(serviceName => 
        this.startService(serviceName).catch(error => 
          console.error(`❌ Failed to start ${serviceName}:`, error.message)
        )
      );
      await Promise.all(promises);
    } else {
      // Start services in dependency order
      for (const serviceName of this.startupOrder) {
        try {
          await this.startService(serviceName);
        } catch (error) {
          console.error(`❌ Failed to start ${serviceName}:`, error.message);
        }
      }
    }
    
    console.log('✅ All services started');
  }

  async stopAllServices(): Promise<void> {
    console.log('🛑 Stopping all services...');
    
    // Stop in reverse order
    const reverseOrder = [...this.startupOrder].reverse();
    for (const serviceName of reverseOrder) {
      await this.stopService(serviceName);
    }
    
    console.log('✅ All services stopped');
  }

  async restartService(serviceName: string): Promise<void> {
    await this.stopService(serviceName);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await this.startService(serviceName);
  }

  getServiceStatus(serviceName: string): 'running' | 'stopped' | 'unknown' {
    const process = this.processes.get(serviceName);
    if (!process) return 'stopped';
    if (process.pid && process.connected !== false) return 'running';
    return 'unknown';
  }

  getAllServicesStatus(): Record<string, 'running' | 'stopped' | 'unknown'> {
    const status: Record<string, 'running' | 'stopped' | 'unknown'> = {};
    
    for (const serviceName of Object.keys(SERVICE_REGISTRY)) {
      status[serviceName] = this.getServiceStatus(serviceName);
    }
    
    return status;
  }

  private getCommandForService(serviceName: string): string {
    const service = SERVICE_REGISTRY[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }
    
    const commandMap: Record<string, string> = {
      mainApi: 'bun',
      riskAnalysis: 'bun',
      aiPrediction: 'bun',
      guardianNetwork: 'bun',
      familyControls: 'bun',
      shoppingDemo: 'bun',
      duoplusAdmin: 'bun',
      crossFamilyNetwork: 'bun',
      suspensionRisk: 'bun',
      configManagement: 'bun',
      configDashboard: 'bun',
      docsServer: 'bunx'
    };

    return commandMap[serviceName] || 'bun';
  }

  private getArgsForService(serviceName: string): string[] {
    const service = SERVICE_REGISTRY[serviceName];
    if (!service) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }
    
    const argsMap: Record<string, string[]> = {
      mainApi: ['run', 'cash-app-api-server.ts'],
      riskAnalysis: ['run', 'suspension-risk-api-server.ts'],
      aiPrediction: ['run', 'ai/anomaly-predict.ts'],
      guardianNetwork: ['run', 'guardian-network-engine.ts'],
      familyControls: ['run', 'family-controls-api-server.ts'],
      shoppingDemo: ['run', 'shopping/server.ts'],
      duoplusAdmin: ['run', 'duoplus-api-server.ts'],
      crossFamilyNetwork: ['run', 'cross-family-network-api-server.ts'],
      suspensionRisk: ['run', 'suspension-risk-api-server.ts'],
      configManagement: ['run', 'src/admin/config-server.ts'],
      configDashboard: ['run', 'src/admin/config-server.ts'],
      docsServer: ['http-server', 'docs', '-p', '8080']
    };

    return argsMap[serviceName] || [];
  }

  private async waitForService(serviceName: string, port: number, timeout = 30000): Promise<void> {
    const service = SERVICE_REGISTRY[serviceName];
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${service.protocol}://${service.host}:${port}${service.healthCheck}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (response.ok) {
          return;
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`Service ${serviceName} failed to start within ${timeout}ms`);
  }
}

// CLI interface
export async function main() {
  const manager = new ServiceManager();
  const command = process.argv[2];
  const serviceName = process.argv[3];

  switch (command) {
    case 'start':
      if (serviceName) {
        await manager.startService(serviceName);
      } else {
        await manager.startAllServices();
      }
      break;
      
    case 'stop':
      if (serviceName) {
        await manager.stopService(serviceName);
      } else {
        await manager.stopAllServices();
      }
      break;
      
    case 'restart':
      if (serviceName) {
        await manager.restartService(serviceName);
      } else {
        await manager.stopAllServices();
        await manager.startAllServices();
      }
      break;
      
    case 'status':
      const status = manager.getAllServicesStatus();
      console.table(status);
      break;
      
    case 'logs':
      if (serviceName) {
        console.log(`📋 Logs for ${serviceName}:`);
        // Implementation would depend on your logging setup
      }
      break;
      
    default:
      console.log(`
Usage: bun run service-manager.ts <command> [service-name]

Commands:
  start [service]   Start a specific service or all services
  stop [service]    Stop a specific service or all services
  restart [service] Restart a specific service or all services
  status           Show status of all services
  logs [service]   Show logs for a specific service

Available services:
${Object.keys(SERVICE_REGISTRY).join(', ')}
      `);
  }
}

// CLI interface
if (require.main === module) {
  main().catch(console.error);
}
