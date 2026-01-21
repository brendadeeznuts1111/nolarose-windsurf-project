#!/usr/bin/env bun
// Test script to demonstrate Bun server port configuration
// Following official Bun documentation examples

import { serve } from "bun";

// Example 1: Fixed port configuration
console.log("🚀 Testing fixed port configuration...");
const server1 = serve({
  port: 3000,
  hostname: "localhost",
  fetch(req) {
    return new Response("Fixed port server running!");
  },
});

console.log(`📍 Server 1 URL: ${server1.url}`);
console.log(`🔢 Server 1 Port: ${server1.port}`);

// Example 2: Random port configuration (as shown in Bun docs)
console.log("\n🎲 Testing random port configuration...");
const server2 = serve({
  port: 0, // random port
  hostname: "localhost",
  fetch(req) {
    return new Response("Random port server running!");
  },
});

console.log(`📍 Server 2 URL: ${server2.url}`);
console.log(`🔢 Server 2 Port: ${server2.port}`);

// Example 3: Environment variable configuration
console.log("\n🌍 Testing environment variable configuration...");
const server3 = serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3051,
  hostname: process.env.HOST || "0.0.0.0",
  fetch(req) {
    return new Response("Environment-configured server running!");
  },
});

console.log(`📍 Server 3 URL: ${server3.url}`);
console.log(`🔢 Server 3 Port: ${server3.port}`);

// Cleanup after 2 seconds
setTimeout(() => {
  server1.stop();
  server2.stop();
  server3.stop();
  console.log("\n✅ All test servers stopped");
}, 2000);

console.log("\n📊 All servers following official Bun documentation patterns");
