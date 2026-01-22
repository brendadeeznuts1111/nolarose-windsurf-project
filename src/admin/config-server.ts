#!/usr/bin/env bun
// src/admin/config-server.ts - Configuration Status Web Server
// Serves the configuration page with real-time status

import { ConfigPage } from "./config-page";
import { config } from "../config/config";
import { configFreeze } from "./config-freeze";
import { UnifiedLandingPage } from "./unified-landing";
import packageJson from "../../package.json";

class ConfigServer {
  private configPage = new ConfigPage();
  private unifiedLanding = new UnifiedLandingPage();
  private server: any;
  private port: number;
  private isStopping: boolean = false;
  private startTime: Date = new Date();
  private requestCount: number = 0;
  private activeConnections: Set<string> = new Set();

  constructor() {
    this.port = config.getDuoPlusConfig().port;
  }

  /**
   * Start the configuration server
   */
  async start(): Promise<void> {
    console.log("🌐 Starting DuoPlus Configuration Server...");
    console.log(`📊 Port: ${this.port}`);
    console.log(`🔧 Environment: ${config.getDuoPlusConfig().environment}`);
    console.log("");

    // Create Bun server with enhanced lifecycle management
    this.server = Bun.serve({
      port: this.port,
      hostname: config.getDuoPlusConfig().host,
      
      // Main fetch handler with request tracking
      fetch: async (req, server) => {
        // Track request
        this.requestCount++;
        const requestId = crypto.randomUUID();
        this.activeConnections.add(requestId);
        
        // Set custom timeout based on endpoint
        const url = new URL(req.url);
        if (url.pathname.startsWith('/api/config')) {
          server.timeout(req, 30); // 30 seconds for config endpoints
        } else if (url.pathname === '/health') {
          server.timeout(req, 5); // 5 seconds for health check
        } else {
          server.timeout(req, 60); // Default 60 seconds
        }
        
        // Log request with client IP
        const clientIP = server.requestIP(req);
        console.log(`📥 ${req.method} ${url.pathname} - ${clientIP?.address || 'unknown'} [${requestId}]`);
        
        try {
          // Route the request
          const response = await this.routeRequest(req, server);
          
          // Clean up connection tracking
          setTimeout(() => {
            this.activeConnections.delete(requestId);
          }, 100);
          
          return response;
        } catch (error) {
          console.error(`❌ Request error [${requestId}]:`, error);
          this.activeConnections.delete(requestId);
          return new Response("Internal Server Error", { status: 500 });
        }
      },
      
      // Error handler
      error(error: Error) {
        console.error("❌ Server error:", error);
        return new Response("Internal Server Error", { status: 500 });
      },
      
      // Development mode settings
      development: config.getDuoPlusConfig().debug,
    });

    console.log(`✅ Configuration server started successfully!`);
    console.log(`🌐 Unified Dashboard: http://${config.getDuoPlusConfig().host}:${this.port}/`);
    console.log(`📊 Configuration Page: http://${config.getDuoPlusConfig().host}:${this.port}/config`);
    console.log(`🔧 Config API: http://${config.getDuoPlusConfig().host}:${this.port}/api/config`);
    console.log(`📈 Status API: http://${config.getDuoPlusConfig().host}:${this.port}/api/status`);
    console.log(`📊 Metrics API: http://${config.getDuoPlusConfig().host}:${this.port}/api/metrics`);
    console.log(`🏥 Health Check: http://${config.getDuoPlusConfig().host}:${this.port}/health`);
    console.log("");
    console.log("🔄 Auto-refresh enabled (60-second intervals)");
    console.log("⌨️  Keyboard shortcuts: Ctrl+R (refresh), Ctrl+Shift+C (config)");
    console.log("🔒 Use freeze/unfreeze buttons to control hot reloading");
    console.log("⌨️  Press Ctrl+C to stop the server");
    console.log("");
    console.log("📊 Server Metrics:");
    console.log(`   • Server ID: ${this.server.id}`);
    console.log(`   • Development Mode: ${this.server.development}`);
    console.log(`   • Process Ref: Enabled (keeps process alive)`);

    // Set up graceful shutdown handlers
    this.setupGracefulShutdown();
  }

  /**
   * Route requests to appropriate handlers
   */
  private async routeRequest(req: Request, server: any): Promise<Response> {
    const url = new URL(req.url);
    
    switch (url.pathname) {
      case "/":
        return this.handleUnifiedLanding();
      case "/config":
        return this.handleConfigPage();
      case "/api/config":
        return this.handleConfigAPI();
      case "/api/status":
        return this.handleStatusAPI();
      case "/api/config/freeze":
        return this.handleFreezeConfig(req);
      case "/api/config/unfreeze":
        return this.handleUnfreezeConfig();
      case "/api/config/freeze-status":
        return this.handleFreezeStatus();
      case "/health":
        return this.handleHealth();
      case "/api/metrics":
        return this.handleMetrics(server);
      case "/api/reload":
        return this.handleReload();
      default:
        return new Response("Not Found", { status: 404 });
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isStopping) {
        console.log("\n⚠️ Force shutdown detected...");
        process.exit(1);
      }
      
      this.isStopping = true;
      console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
      
      try {
        // Stop accepting new connections
        console.log("🛑 Stopping new connections...");
        
        // Wait for active connections to finish (with timeout)
        const maxWaitTime = 10000; // 10 seconds
        const startTime = Date.now();
        
        while (this.activeConnections.size > 0 && Date.now() - startTime < maxWaitTime) {
          console.log(`⏳ Waiting for ${this.activeConnections.size} active connections...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        if (this.activeConnections.size > 0) {
          console.log(`⚡ Force closing ${this.activeConnections.size} remaining connections...`);
          await this.server.stop(true); // Force stop
        } else {
          console.log("✅ All connections completed, stopping server...");
          await this.server.stop(); // Graceful stop
        }
        
        console.log("✅ Server stopped successfully");
        process.exit(0);
      } catch (error) {
        console.error("❌ Error during shutdown:", error);
        process.exit(1);
      }
    };

    // Handle shutdown signals
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    
    // Handle uncaught exceptions
    process.on("uncaughtException", (error: any) => {
      console.error("💥 Uncaught Exception:", error);
      shutdown("uncaughtException");
    });
    
    process.on("unhandledRejection", (reason: any, promise: any) => {
      console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
      shutdown("unhandledRejection");
    });
  }

  /**
   * Handle server metrics endpoint
   */
  private handleMetrics(server: any): Response {
    const uptime = Math.floor(process.uptime());
    const memoryUsage = process.memoryUsage();
    
    const metrics = {
      server: {
        id: this.server.id,
        url: this.server.url,
        port: this.server.port,
        hostname: this.server.hostname,
        development: this.server.development,
        pendingRequests: this.server.pendingRequests,
        pendingWebSockets: this.server.pendingWebSockets,
      },
      process: {
        uptime: uptime,
        uptimeFormatted: this.formatUptime(uptime),
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
          external: Math.round(memoryUsage.external / 1024 / 1024) + "MB",
        },
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
      },
      application: {
        startTime: this.startTime.toISOString(),
        requestCount: this.requestCount,
        activeConnections: this.activeConnections.size,
        isFrozen: configFreeze.isConfigurationFrozen(),
        environment: config.getDuoPlusConfig().environment,
      },
    };

    return new Response(JSON.stringify(metrics, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  }

  /**
   * Format uptime into human readable format
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
    
    return parts.join(" ");
  }

  /**
   * Reload server configuration (hot reload)
   */
  public async reloadConfiguration(): Promise<void> {
    if (configFreeze.isConfigurationFrozen()) {
      throw new Error("Cannot reload configuration while frozen");
    }
    
    console.log("🔄 Hot reloading configuration...");
    
    // Reload configuration
    this.server.reload({
      fetch: (req, server) => {
        // Use updated routing
        return this.routeRequest(req, server);
      },
      error: (error: Error) => {
        console.error("❌ Server error:", error);
        return new Response("Internal Server Error", { status: 500 });
      },
      development: config.getDuoPlusConfig().debug,
    });
    
    console.log("✅ Configuration reloaded successfully");
  }

  /**
   * Handle configuration reload endpoint
   */
  private handleReload(): Response {
    try {
      // Check if configuration is frozen
      if (configFreeze.isConfigurationFrozen()) {
        console.log("🚫 Reload blocked - configuration is frozen");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Cannot reload configuration while frozen",
          frozen: true,
          reason: configFreeze.getFreezeStatus()?.reason
        }), {
          status: 423,
          headers: { "Content-Type": "application/json" },
        });
      }
      
      console.log("🔄 Hot reloading configuration...");
      
      // Trigger hot reload
      this.reloadConfiguration();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Configuration reloaded successfully",
        frozen: false
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("❌ Error reloading config:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: (error as any).message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Get server statistics
   */
  public getServerStats() {
    return {
      uptime: Math.floor(process.uptime()),
      requestCount: this.requestCount,
      activeConnections: this.activeConnections.size,
      pendingRequests: this.server.pendingRequests,
      pendingWebSockets: this.server.pendingWebSockets,
      isFrozen: configFreeze.isConfigurationFrozen(),
      serverId: this.server.id,
      startTime: this.startTime,
    };
  }

  /**
   * Handle unified landing page
   */
  private handleUnifiedLanding(): Response {
    try {
      const html = this.unifiedLanding.generateUnifiedLandingPage();
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error: any) {
      console.error("❌ Error generating unified landing page:", error);
      return new Response("Error generating landing page", { status: 500 });
    }
  }

  /**
   * Handle main configuration page
   */
  private handleConfigPage(): Response {
    try {
      const html = this.configPage.generateConfigPage();
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error: any) {
      console.error("❌ Error generating config page:", error);
      return new Response("Error generating configuration page", { status: 500 });
    }
  }

  /**
   * Handle configuration API endpoint
   */
  private handleConfigAPI(): Response {
    try {
      const configData = config.getConfig();
      return new Response(JSON.stringify(configData, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error: any) {
      console.error("❌ Error serving config API:", error);
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handle status API endpoint
   */
  private handleStatusAPI(): Response {
    try {
      const duoplusConfig = config.getDuoPlusConfig();
      const status = {
        environment: duoplusConfig.environment,
        debug: duoplusConfig.debug,
        metricsEnabled: duoplusConfig.metricsEnabled,
        features: duoplusConfig.features,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: packageJson.version,
      };

      return new Response(JSON.stringify(status, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      });
    } catch (error: any) {
      console.error("❌ Error serving status API:", error);
      return new Response(JSON.stringify({ error: "Status error" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handle health check endpoint
   */
  private handleHealth(): Response {
    try {
      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: config.getDuoPlusConfig().environment,
        version: packageJson.version,
      };

      return new Response(JSON.stringify(health), {
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache",
        },
      });
    } catch (error) {
      console.error("❌ Health check failed:", error);
      return new Response(JSON.stringify({ 
        status: "unhealthy", 
        error: error.message,
        timestamp: new Date().toISOString(),
      }), {
        status: 503,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handle freeze configuration endpoint
   */
  private async handleFreezeConfig(request: Request): Promise<Response> {
    try {
      const body = await request.json();
      const reason = body?.reason;
      
      configFreeze.freeze(reason);
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Configuration frozen",
        status: configFreeze.getFreezeStatus()
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("❌ Error freezing config:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: (error as any).message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handle unfreeze configuration endpoint
   */
  private handleUnfreezeConfig(): Response {
    try {
      configFreeze.unfreeze();
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Configuration unfrozen"
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("❌ Error unfreezing config:", error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: (error as any).message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Handle freeze status endpoint
   */
  private handleFreezeStatus(): Response {
    try {
      const status = configFreeze.getFreezeStatus();
      
      return new Response(JSON.stringify({ 
        frozen: configFreeze.isConfigurationFrozen(),
        status: status
      }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (error: any) {
      console.error("❌ Error getting freeze status:", error);
      return new Response(JSON.stringify({ 
        frozen: false, 
        error: (error as any).message 
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  /**
   * Stop the server
   */
  async stop(): Promise<void> {
    if (this.server) {
      console.log("\n🛑 Shutting down configuration server...");
      this.server.stop();
      console.log("✅ Server stopped successfully");
    }
  }
}

// Start server if run directly
if (require.main === module) {
  const server = new ConfigServer();
  
  // Handle graceful shutdown
  process.on("SIGINT", async () => {
    await server.stop();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.start().catch((error) => {
    console.error("❌ Failed to start configuration server:", error);
    process.exit(1);
  });
}

export { ConfigServer };
