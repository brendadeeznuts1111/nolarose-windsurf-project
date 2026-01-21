// Deep nested object for console-depth 10 demonstration
const deepObject = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: {
              level7: {
                level8: {
                  level9: {
                    level10: {
                      value: "Deep nested value at level 10",
                      metadata: {
                        created: new Date().toISOString(),
                        type: "deep_object_demo",
                        config: {
                          enabled: true,
                          priority: "high",
                          settings: {
                            threshold: 0.95,
                            timeout: 5000,
                            features: {
                              root_detected: { weight: 0.28, active: true },
                              vpn_active: { weight: 0.22, active: true },
                              thermal_spike: { weight: 0.15, active: false }
                            }
                          }
                        }
                      }
                    }
                  },
                  level9Sibling: "Level 9 sibling value"
                },
                level8Sibling: "Level 8 sibling value"
              },
              level7Sibling: "Level 7 sibling value"
            },
            level6Sibling: "Level 6 sibling value"
          },
          level5Sibling: "Level 5 sibling value"
        },
        level4Sibling: "Level 4 sibling value"
      },
      level3Sibling: "Level 3 sibling value"
    },
    level2Sibling: "Level 2 sibling value"
  },
  level1Sibling: "Level 1 sibling value"
};

console.log("=== Console Depth 10 Demonstration ===");
console.log("Deep nested object with 10 levels:");
console.log(deepObject);

console.log("\n📊 Feature Configuration Table:");
const features = [
  {
    name: "root_detected",
    config: {
      weight: 0.28,
      threshold: 1,
      metadata: {
        source: "device_api",
        reliability: 0.98,
        details: {
          collection_method: "system_call",
          validation: "strict",
          performance: {
            latency_ms: 2,
            cpu_usage: 0.1,
            memory_kb: 128
          }
        }
      }
    },
    {
      name: "vpn_active",
      config: {
        weight: 0.22,
        threshold: 1,
        metadata: {
          source: "network_analysis",
          reliability: 0.95,
          details: {
            collection_method: "packet_inspection",
            validation: "moderate",
            performance: {
              latency_ms: 3,
              cpu_usage: 0.15,
              memory_kb: 256
            }
          }
        }
      }
    }
];

console.table(features.map(f => ({
  Feature: f.name,
  Weight: f.config.weight,
  Threshold: f.config.threshold,
  Source: f.config.metadata.source,
  Reliability: f.config.metadata.reliability,
  Collection: f.config.metadata.details.collection_method,
  Latency: `${f.config.metadata.details.performance.latency_ms}ms`,
  Memory: `${f.config.metadata.details.performance.memory_kb}KB`
})));

console.log("\n✅ Console depth 10 demonstration complete!");
