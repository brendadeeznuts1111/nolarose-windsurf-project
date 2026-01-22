export interface ServiceConfig {
  name: string;
  port: number;
  host: string;
  protocol: 'http' | 'https' | 'ws' | 'wss';
  healthCheck: string;
  dependencies: string[];
  environment: Record<string, string>;
}

export const SERVICE_REGISTRY: Record<string, ServiceConfig> = {
  mainApi: {
    name: 'Main API Server',
    port: 3000,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/health',
    dependencies: ['redis', 'database'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3000'
    }
  },
  riskAnalysis: {
    name: 'Risk Analysis API',
    port: 3001,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/risk/health',
    dependencies: ['mainApi'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3001'
    }
  },
  aiPrediction: {
    name: 'AI/ML Prediction Service',
    port: 3002,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/ai/health',
    dependencies: ['riskAnalysis'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3002'
    }
  },
  guardianNetwork: {
    name: 'Guardian Network Service',
    port: 3003,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/guardian/health',
    dependencies: ['mainApi'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3003'
    }
  },
  familyControls: {
    name: 'Family Controls API',
    port: 3004,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/family/health',
    dependencies: ['mainApi'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3004'
    }
  },
  shoppingDemo: {
    name: 'Shopping Demo Server',
    port: 3005,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/health',
    dependencies: [],
    environment: {
      NODE_ENV: 'development',
      PORT: '3005'
    }
  },
  duoplusAdmin: {
    name: 'DuoPlus Admin Dashboard',
    port: 3006,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/admin/health',
    dependencies: ['mainApi'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3006'
    }
  },
  crossFamilyNetwork: {
    name: 'Cross-Family Network API',
    port: 3007,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/network/health',
    dependencies: ['guardianNetwork'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3007'
    }
  },
  suspensionRisk: {
    name: 'Suspension Risk Engine',
    port: 3008,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/suspension/health',
    dependencies: ['aiPrediction'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3008'
    }
  },
  configManagement: {
    name: 'Configuration Management Server',
    port: 3009,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/api/config/health',
    dependencies: [],
    environment: {
      NODE_ENV: 'development',
      PORT: '3009'
    }
  },
  configDashboard: {
    name: 'Configuration Dashboard',
    port: 3227,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/health',
    dependencies: ['configManagement'],
    environment: {
      NODE_ENV: 'development',
      PORT: '3227'
    }
  },
  docsServer: {
    name: 'Documentation Server',
    port: 8080,
    host: 'localhost',
    protocol: 'http',
    healthCheck: '/',
    dependencies: [],
    environment: {
      NODE_ENV: 'development',
      PORT: '8080'
    }
  }
};

export async function findAvailablePort(basePort: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = basePort + i;
    try {
      const available = await checkPortAvailable(port);
      if (available) return port;
    } catch (error) {
      continue;
    }
  }
  throw new Error(`No available port found starting from ${basePort}`);
}

export async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = require('net').createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => resolve(false));
  });
}

export function getPortForService(serviceName: string): number {
  const env = process.env.NODE_ENV || 'development';
  const service = SERVICE_REGISTRY[serviceName];
  
  if (!service) {
    throw new Error(`Service ${serviceName} not found in registry`);
  }
  
  // Allow environment override
  const envPort = process.env[`${serviceName.toUpperCase()}_PORT`];
  if (envPort) {
    return parseInt(envPort, 10);
  }
  
  return service.port;
}

export async function checkServiceHealth(serviceName: string): Promise<boolean> {
  const service = SERVICE_REGISTRY[serviceName];
  if (!service) return false;
  
  try {
    const response = await fetch(`${service.protocol}://${service.host}:${service.port}${service.healthCheck}`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

export async function checkAllServicesHealth(): Promise<Record<string, boolean>> {
  const results: Record<string, boolean> = {};
  
  for (const serviceName of Object.keys(SERVICE_REGISTRY)) {
    results[serviceName] = await checkServiceHealth(serviceName);
  }
  
  return results;
}
