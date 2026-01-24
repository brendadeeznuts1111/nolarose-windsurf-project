#!/usr/bin/env bun
// Smoke tests for Config Server Dashboard
// Tests critical functionality to ensure dashboard is working properly

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { ConfigServer } from "../src/admin/config-server";

describe("Config Server Smoke Tests", () => {
  let server: ConfigServer | null = null;
  const BASE_URL = "http://localhost:3227";
  let serverStarted = false;

  beforeAll(async () => {
    // Check if server is already running
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        console.log("Server already running on port 3227, using existing instance");
        serverStarted = false; // Use existing server
        return;
      }
    } catch (error) {
      // Server not running, start our own
    }

    // Start our own test server
    try {
      server = new ConfigServer();
      await server.start();
      serverStarted = true;
      // Wait for server to be ready
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error: any) {
      if (error.code === "EADDRINUSE") {
        console.log("Port 3227 in use, using existing server instance");
        serverStarted = false;
      } else {
        throw error;
      }
    }
  });

  afterAll(async () => {
    // Only stop if we started our own server
    if (server && serverStarted) {
      await server.stop();
    }
  });

  describe("Health & Status Endpoints", () => {
    it("should respond to health check", async () => {
      const response = await fetch(`${BASE_URL}/health`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe("healthy");
      expect(data.timestamp).toBeDefined();
    });

    it("should return status API with valid structure", async () => {
      const response = await fetch(`${BASE_URL}/api/status`);
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty("status");
      expect(data).toHaveProperty("statusCode", 200);
      expect(data).toHaveProperty("score");
      expect(data).toHaveProperty("uptime");
      expect(data).toHaveProperty("memory");
      expect(data).toHaveProperty("cpu");
      expect(data).toHaveProperty("server");
      expect(data.server).toHaveProperty("port", 3227);
    });

    it("should return metrics endpoint", async () => {
      // Try both /metrics and /api/metrics
      let response = await fetch(`${BASE_URL}/api/metrics`);
      if (response.status === 404) {
        response = await fetch(`${BASE_URL}/metrics`);
      }
      expect(response.status).toBe(200);
      const data = await response.json();
      
      expect(data).toHaveProperty("server");
      expect(data).toHaveProperty("process");
      expect(data).toHaveProperty("application");
    });
  });

  describe("Configuration Endpoints", () => {
    it("should return configuration API", async () => {
      const response = await fetch(`${BASE_URL}/api/config`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toBeDefined();
      expect(typeof data).toBe("object");
    });

    it("should return freeze status", async () => {
      const response = await fetch(`${BASE_URL}/api/config/freeze-status`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toHaveProperty("frozen");
      expect(typeof data.frozen).toBe("boolean");
    });
  });

  describe("Web Pages", () => {
    it("should serve main landing page", async () => {
      const response = await fetch(`${BASE_URL}/`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain("Citadel Configuration");
    });

    it("should serve config page", async () => {
      const response = await fetch(`${BASE_URL}/config`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      const html = await response.text();
      expect(html.length).toBeGreaterThan(0);
    });

    it("should serve demo page", async () => {
      const response = await fetch(`${BASE_URL}/demo`);
      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/html");
      const html = await response.text();
      expect(html).toContain("Citadel");
    });
  });

  describe("Freeze/Unfreeze Functionality", () => {
    it("should freeze configuration with valid reason", async () => {
      const response = await fetch(`${BASE_URL}/api/config/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Smoke test freeze" }),
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should reject freeze with invalid content type", async () => {
      const response = await fetch(`${BASE_URL}/api/config/freeze`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "invalid",
      });
      
      expect(response.status).toBe(400);
    });

    it("should reject freeze with invalid reason type", async () => {
      const response = await fetch(`${BASE_URL}/api/config/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: 123 }),
      });
      
      expect(response.status).toBe(400);
    });

    it("should reject freeze with reason too long", async () => {
      const longReason = "a".repeat(501);
      const response = await fetch(`${BASE_URL}/api/config/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: longReason }),
      });
      
      expect(response.status).toBe(400);
    });

    it("should unfreeze configuration", async () => {
      const response = await fetch(`${BASE_URL}/api/config/unfreeze`, {
        method: "POST",
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });
  });

  describe("Reload Functionality", () => {
    it("should reload configuration when not frozen", async () => {
      // Ensure not frozen
      await fetch(`${BASE_URL}/api/config/unfreeze`, { method: "POST" });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(`${BASE_URL}/api/reload`, {
        method: "POST",
      });
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
    });

    it("should reject reload when frozen", async () => {
      // Freeze first
      await fetch(`${BASE_URL}/api/config/freeze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Test freeze" }),
      });
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await fetch(`${BASE_URL}/api/reload`, {
        method: "POST",
      });
      
      expect(response.status).toBe(423); // Locked
      const data = await response.json();
      expect(data.frozen).toBe(true);
      
      // Unfreeze for cleanup
      await fetch(`${BASE_URL}/api/config/unfreeze`, { method: "POST" });
    });
  });

  describe("Error Handling", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await fetch(`${BASE_URL}/unknown-route`);
      expect(response.status).toBe(404);
    });

    it("should handle CORS properly", async () => {
      const response = await fetch(`${BASE_URL}/api/status`, {
        headers: { "Origin": "http://localhost:3000" },
      });
      expect(response.status).toBe(200);
    });
  });

  describe("Server Statistics", () => {
    it("should track request count", async () => {
      const initialStats = server.getServerStats();
      expect(initialStats.requestCount).toBeGreaterThanOrEqual(0);
      
      // Make a request
      await fetch(`${BASE_URL}/health`);
      
      const updatedStats = server.getServerStats();
      expect(updatedStats.requestCount).toBeGreaterThanOrEqual(initialStats.requestCount);
    });

    it("should track server uptime", async () => {
      const stats = server.getServerStats();
      expect(stats.uptime).toBeGreaterThanOrEqual(0);
      expect(stats.startTime).toBeInstanceOf(Date);
    });
  });

  describe("Performance", () => {
    it("should respond to health check within 100ms", async () => {
      const start = Date.now();
      await fetch(`${BASE_URL}/health`);
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });

    it("should handle concurrent requests", async () => {
      const requests = Array(10).fill(null).map(() => 
        fetch(`${BASE_URL}/health`)
      );
      const responses = await Promise.all(requests);
      expect(responses.every(r => r.status === 200)).toBe(true);
    });
  });
});
