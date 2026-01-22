#!/usr/bin/env bun

// debug-rate-limiter.js - Debug suspicious pattern detection
import { EnhancedRateLimiter } from './security/enhanced-rate-limiter.js';

console.log("🔍 Debugging Enhanced Rate Limiter");

async function debugSuspiciousPatterns() {
    const rateLimiter = new EnhancedRateLimiter();
    
    // Test IP rotation
    console.log("\n📍 Testing IP rotation detection...");
    const request = {
        deviceFingerprint: 'device_rotation_test',
        ip: '192.168.1.50',
        path: '/api/funding',
        method: 'POST'
    };

    // Make multiple requests with different IPs
    for (let i = 0; i < 5; i++) {
        request.ip = `192.168.1.${50 + i}`;
        console.log(`Making request with IP: ${request.ip}`);
        const result = await rateLimiter.checkRateLimit(request);
        console.log(`Result: allowed=${result.allowed}, suspicious=${result.suspicious}, patterns=${result.patterns}`);
    }

    // Test user rotation
    console.log("\n👤 Testing user rotation detection...");
    const userRequest = {
        ip: '192.168.1.60',
        deviceFingerprint: 'device_user_rotation',
        path: '/api/funding',
        method: 'POST'
    };

    for (let i = 0; i < 5; i++) {
        userRequest.userId = `user_rotation_${i}`;
        console.log(`Making request with user: ${userRequest.userId}`);
        const result = await rateLimiter.checkRateLimit(userRequest);
        console.log(`Result: allowed=${result.allowed}, suspicious=${result.suspicious}, patterns=${result.patterns}`);
    }

    // Test bot-like timing
    console.log("\n🤖 Testing bot-like pattern detection...");
    const botRequest = {
        ip: '192.168.1.70',
        path: '/api/verify',
        method: 'POST'
    };

    const startTime = Date.now();
    for (let i = 0; i < 5; i++) {
        botRequest.timestamp = startTime + (i * 5000);
        console.log(`Making request at timestamp: ${botRequest.timestamp}`);
        const result = await rateLimiter.checkRateLimit(botRequest);
        console.log(`Result: allowed=${result.allowed}, suspicious=${result.suspicious}, patterns=${result.patterns}`);
    }

    // Get statistics
    console.log("\n📊 Final Statistics:");
    const stats = rateLimiter.getStatistics();
    console.log(`Counters: ${stats.counters}`);
    console.log(`Active blocks: ${stats.activeBlocks}`);
    console.log(`Suspicious patterns: ${stats.suspiciousPatterns}`);

    rateLimiter.stop();
}

debugSuspiciousPatterns().catch(console.error);
