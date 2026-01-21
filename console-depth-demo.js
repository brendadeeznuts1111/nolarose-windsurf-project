// Comprehensive --console-depth <N> demonstration
// Shows how different N values affect object inspection depth

// Create a complex nested object with multiple levels
const complexObject = {
  // Level 1: Main categories
  fraudDetection: {
    // Level 2: Sub-systems
    aiModels: {
      // Level 3: Model types
      ensemble: {
        // Level 4: Model configurations
        gradientBoosting: {
          // Level 5: Detailed parameters
          hyperparameters: {
            // Level 6: Optimization settings
            learningRate: {
              // Level 7: Dynamic configuration
              adaptive: {
                // Level 8: Advanced settings
                scheduler: {
                  // Level 9: Fine-tuning parameters
                  decay: {
                    // Level 10: Deep configuration
                    exponential: {
                      rate: 0.95,
                      minRate: 0.001,
                      maxRate: 0.1,
                      adaptive: true,
                      metadata: {
                        source: "research_paper_2024",
                        validated: true,
                        performance: {
                          accuracy: 0.947,
                          precision: 0.923,
                          recall: 0.967,
                          f1Score: 0.944,
                          latency: {
                            avgMs: 12.5,
                            p95Ms: 23.8,
                            p99Ms: 45.2
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    // Level 2: Other sub-systems
    networkOptimization: {
      preconnect: {
        hosts: ["api.example.com", "cdn.example.com"],
        timeout: 5000
      }
    }
  },
  // Level 1: Another main category
  configuration: {
    // Level 2: Settings
    thresholds: {
      // Level 3: Risk levels
      critical: 0.9,
      high: 0.7,
      medium: 0.5
    }
  }
};

console.log("=== --console-depth <N> Demonstration ===");
console.log("Complex nested object with 10+ levels:");
console.log(complexObject);

console.log("\n📊 Feature Matrix with Different Depths:");
const featureMatrix = [
  {
    feature: "root_detected",
    weight: 0.28,
    config: {
      threshold: 1,
      metadata: {
        source: "device_api",
        validation: {
          strict: true,
          rules: {
            system_call: true,
            permission_check: true,
            integrity: {
              hash_verification: true,
              signature_check: true
            }
          }
        }
      }
    }
  },
  {
    feature: "vpn_active",
    weight: 0.22,
    config: {
      threshold: 1,
      metadata: {
        source: "network_analysis",
        validation: {
          strict: false,
          rules: {
            ip_check: true,
            dns_leak: false,
            integrity: {
              geo_verification: true,
              speed_test: false
            }
          }
        }
      }
    }
  }
];

console.table(featureMatrix.map(f => ({
  Feature: f.feature,
  Weight: f.weight,
  Threshold: f.config.threshold,
  Source: f.config.metadata.source,
  Strict: f.config.metadata.validation.strict,
  Rules: Object.keys(f.config.metadata.validation.rules).length,
  Integrity: Object.keys(f.config.metadata.validation.integrity).length
})));

console.log("\n🎯 Depth Level Summary:");
console.log("Depth 0: No object expansion (flat)");
console.log("Depth 1: Show only top level");
console.log("Depth 2: Default Bun behavior");
console.log("Depth 3-4: Good for complex configurations");
console.log("Depth 5-7: Deep debugging and analysis");
console.log("Depth 8-10: Maximum inspection (verbose)");

console.log("\n✅ Console depth demonstration complete!");
console.log("Try: bun --console-depth <N> run console-depth-demo.js");
