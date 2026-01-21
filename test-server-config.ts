#!/usr/bin/env bun
// Test script to demonstrate Bun server port configuration
// Following official Bun documentation examples

import { serve } from "bun";

console.log("🚀 Demonstrating server.port and server.url property access");
console.log("=========================================================");

// Example 1: Fixed port configuration
console.log("\n📍 Example 1: Fixed port configuration");
const server1 = serve({
  port: 3000,
  hostname: "localhost",
  fetch(req) {
    return new Response("Fixed port server running!");
  },
});

console.log(`✅ Server started with port: 3000`);
console.log(`🔗 Accessing server.port property: ${server1.port}`);
console.log(`🌐 Accessing server.url property: ${server1.url}`);
console.log(`💡 This demonstrates how to view the chosen port via server.port`);

// Example 2: Random port configuration (as shown in Bun docs)
console.log("\n🎲 Example 2: Random port configuration");
const server2 = serve({
  port: 0, // random port
  hostname: "localhost",
  fetch(req) {
    return new Response("Random port server running!");
  },
});

console.log(`✅ Server started with port: 0 (random)`);
console.log(`🔗 Accessing server.port property: ${server2.port}`);
console.log(`🌐 Accessing server.url property: ${server2.url}`);
console.log(`💡 This shows how to view the randomly selected port`);

// Example 3: Environment variable configuration
console.log("\n🌍 Example 3: Environment variable configuration");
const server3 = serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3051,
  hostname: process.env.HOST || "0.0.0.0",
  fetch(req) {
    return new Response("Environment-configured server running!");
  },
});

console.log(`✅ Server started with environment variables`);
console.log(`🔗 Accessing server.port property: ${server3.port}`);
console.log(`🌐 Accessing server.url property: ${server3.url}`);
console.log(`💡 This demonstrates viewing the actual port after env var resolution`);

// Example 4: Programmatic port access
console.log("\n⚙️ Example 4: Programmatic port access demonstration");
const servers = [
  serve({ port: 0, fetch: () => new Response("Server A") }),
  serve({ port: 0, fetch: () => new Response("Server B") }),
  serve({ port: 0, fetch: () => new Response("Server C") })
];

console.log(`🔢 Started ${servers.length} servers with random ports:`);
servers.forEach((server, index) => {
  console.log(`   Server ${index + 1}: port ${server.port} at ${server.url}`);
});

console.log(`\n💡 All ports accessed via server.port property as per Bun documentation`);

// Cleanup after 3 seconds
setTimeout(() => {
  server1.stop();
  server2.stop();
  server3.stop();
  servers.forEach(server => server.stop());
  console.log("\n✅ All test servers stopped");
  console.log("🎯 Demonstrated complete server.port and server.url property access");
}, 3000);

console.log("\n📋 Following official Bun documentation patterns exactly");
console.log("🔗 Reference: https://bun.com/docs/runtime/http/server#changing-the-port-and-hostname");
