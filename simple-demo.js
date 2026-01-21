const nested = {
  level1: {
    level2: {
      level3: {
        level4: {
          level5: "Deep nested value"
        }
      }
    }
  }
};

console.log("Default console depth (2):");
console.log(nested);

console.log("\nUsing console.table with features:");
const features = [
  { name: "root_detected", weight: 0.28, impact: "Critical" },
  { name: "vpn_active", weight: 0.22, impact: "High" }
];
console.table(features);
