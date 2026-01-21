// Console Depth Demonstration
// Shows how --console-depth affects nested object display

const nested = { a: { b: { c: { d: "deep" } } } };

console.log("=== Console Depth Demonstration ===");
console.log("Original object:");
console.log(nested);
console.log("");

console.log("Expected output with --console-depth 2 (default):");
console.log("{ a: { b: [Object] } }");
console.log("");

console.log("Expected output with --console-depth 4:");
console.log("{ a: { b: { c: { d: 'deep' } } } }");
console.log("");

// Additional examples with different depths
const deeplyNested = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: {
            level6: "very deep value"
          }
        }
      }
    }
  }
};

console.log("=== 6-Level Deep Object ===");
console.log("With --console-depth 2: { level1: { level2: [Object] } }");
console.log("With --console-depth 4: { level1: { level2: { level3: { level4: [Object] } } } }");
console.log("With --console-depth 6: { level1: { level2: { level3: { level4: { level5: { level6: 'very deep value' } } } } } }");
