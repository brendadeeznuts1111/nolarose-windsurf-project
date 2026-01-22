#!/usr/bin/env bun
// 🧪 src/nexus/citadel-feedback-simple.test.ts - Focused Test Suite
// Testing the Android 13 Nexus Citadel Feedback System core functionality

import { test, expect, describe, beforeEach, afterEach } from "bun:test";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

// Test configuration
const TEST_AUDIT_DIR = "./test-audit";

describe("🏛️ Citadel Feedback System - Core Tests", () => {
  // Import execSync at the top level
  const { execSync } = require("child_process");
  
  beforeEach(async () => {
    // Clean up test environment
    if (existsSync(TEST_AUDIT_DIR)) {
      const { rmSync } = require("fs");
      rmSync(TEST_AUDIT_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_AUDIT_DIR, { recursive: true });
  });

  afterEach(async () => {
    // Clean up after tests
    if (existsSync(TEST_AUDIT_DIR)) {
      const { rmSync } = require("fs");
      rmSync(TEST_AUDIT_DIR, { recursive: true, force: true });
    }
  });

  describe("🔒 Basic Security Incident Logging", () => {
    test.concurrent("logs Apple ID lockout incidents successfully", async () => {
      const deviceId = "test_vm_01";
      const details = "apple_id_lockout test.user@icloud.com";
      
      // Execute feedback command with test device
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      expect(() => {
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
      
      // Verify audit file was created in main audit directory
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json'))
        .filter((f: string) => f.includes(deviceId));
      
      expect(auditFiles.length).toBeGreaterThan(0);
      
      // Verify audit file content
      const { readFileSync } = require("fs");
      const latestFile = auditFiles[auditFiles.length - 1];
      const content = JSON.parse(readFileSync(join("./audit", latestFile), 'utf-8'));
      
      expect(content.deviceId).toBe(deviceId);
      expect(content.details).toBe(details);
      expect(content.event).toBe("security_incident");
      expect(content.severity).toBe("medium");
      expect(content.metadata.source).toBe("cli_feedback");
    }, 10000);

    test.concurrent("handles special characters in device IDs", async () => {
      const deviceId = "../../../etc/passwd"; // Malicious input
      const details = "test_malicious_input";
      
      const command = `DEVICE_ID="${deviceId}" bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      // Should not throw due to sanitization
      expect(() => {
        execSync(command, { 
          cwd: process.cwd(),
          stdio: 'pipe',
          timeout: 5000
        });
      }).not.toThrow();
      
      // Verify file was created with sanitized device ID
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json'));
      
      // Should have sanitized device ID (no path traversal)
      const sanitizedFiles = auditFiles.filter((f: string) => f.includes("___etc_passwd"));
      expect(sanitizedFiles.length).toBeGreaterThan(0);
    }, 10000);
  });

  describe("📊 Dashboard Operations", () => {
    test.concurrent("dashboard search functionality works", async () => {
      // First, create a test incident
      const deviceId = "search_test_01";
      const details = "search_test_incident_unique";
      
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 5000
      });
      
      // Test dashboard search
      const searchCommand = `bun run src/nexus/dashboard.ts --search "search_test_incident_unique"`;
      
      const result = execSync(searchCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(result).toContain("search_test_incident_unique");
      expect(result).toContain("Found");
      expect(result).toContain("incidents matching");
    }, 10000);

    test.concurrent("dashboard metrics display correctly", async () => {
      const metricsCommand = `bun run src/nexus/dashboard.ts --metrics`;
      
      const result = execSync(metricsCommand, { 
        cwd: process.cwd(),
        encoding: 'utf8',
        timeout: 5000
      });
      
      expect(result).toContain("DETAILED CITADEL METRICS");
      expect(result).toContain("SECURITY OVERVIEW");
      expect(result).toContain("Total Incidents:");
    }, 10000);
  });

  describe("⚡ Performance Tests", () => {
    test.concurrent("handles multiple concurrent incidents", async () => {
      const concurrentCount = 5;
      const promises: Promise<any>[] = [];
      
      // Create multiple concurrent incident reports
      for (let i = 0; i < concurrentCount; i++) {
        const deviceId = `concurrent_${i}`;
        const details = `concurrent_incident_${i}`;
        
        const promise = new Promise((resolve, reject) => {
          const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
          
          try {
            execSync(command, { 
              cwd: process.cwd(),
              stdio: 'pipe',
              timeout: 5000
            });
            resolve({ deviceId, details });
          } catch (error) {
            reject(error);
          }
        });
        
        promises.push(promise);
      }
      
      // Wait for all concurrent operations to complete
      const results = await Promise.all(promises);
      
      // Verify all incidents were logged
      expect(results.length).toBe(concurrentCount);
      
      // Verify audit files exist
      const { readdirSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json'))
        .filter((f: string) => f.includes("concurrent_"));
      
      expect(auditFiles.length).toBeGreaterThanOrEqual(concurrentCount);
    }, 15000);
  });

  describe("🛡️ Security Validation", () => {
    test.concurrent("audit file integrity validation", async () => {
      const deviceId = "integrity_test_01";
      const details = "integrity_validation_test";
      
      // Log an incident
      const command = `DEVICE_ID=${deviceId} bun run src/orchestrators/orchestrator.ts --feedback "${details}"`;
      
      execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 5000
      });
      
      // Verify audit file structure
      const { readdirSync, readFileSync } = require("fs");
      const auditFiles = readdirSync("./audit")
        .filter((f: string) => f.endsWith('.feedback.json'))
        .filter((f: string) => f.includes(deviceId));
      
      expect(auditFiles.length).toBeGreaterThanOrEqual(1);
      
      const content = JSON.parse(readFileSync(join("./audit", auditFiles[0]), 'utf-8'));
      
      // Required fields validation
      expect(content).toHaveProperty("timestamp");
      expect(content).toHaveProperty("deviceId");
      expect(content).toHaveProperty("event");
      expect(content).toHaveProperty("details");
      expect(content).toHaveProperty("severity");
      expect(content).toHaveProperty("metadata");
      
      // Data type validation
      expect(typeof content.timestamp).toBe("number");
      expect(typeof content.deviceId).toBe("string");
      expect(typeof content.event).toBe("string");
      expect(typeof content.details).toBe("string");
      expect(typeof content.severity).toBe("string");
      expect(typeof content.metadata).toBe("object");
      
      // Value validation
      expect(content.timestamp).toBeGreaterThan(0);
      expect(content.deviceId).toBe(deviceId);
      expect(content.event).toBe("security_incident");
      expect(content.details).toBe(details);
      expect(["low", "medium", "high", "critical"]).toContain(content.severity);
    }, 10000);
  });
});

// Performance benchmark
describe("⚡ Performance Benchmark", () => {
  // Import execSync at the top level for this describe block
  const { execSync } = require("child_process");
  
  test.concurrent("incident logging performance", async () => {
    const benchmarkCount = 10;
    const startTime = Date.now();
    
    const promises = Array.from({ length: benchmarkCount }, (_, i) => {
      const command = `DEVICE_ID=perf_${i} bun run src/orchestrators/orchestrator.ts --feedback "perf_test_${i}"`;
      
      return execSync(command, { 
        cwd: process.cwd(),
        stdio: 'pipe',
        timeout: 3000
      });
    });
    
    await Promise.all(promises);
    
    const endTime = Date.now();
    const totalTime = endTime - startTime;
    const avgTimePerIncident = totalTime / benchmarkCount;
    
    // Performance assertions
    expect(avgTimePerIncident).toBeLessThan(2000); // Less than 2 seconds per incident
    expect(totalTime).toBeLessThan(10000); // Less than 10 seconds total
    
    console.log(`📊 Performance: ${benchmarkCount} incidents in ${totalTime}ms (${avgTimePerIncident.toFixed(2)}ms per incident)`);
  }, 15000);
});
