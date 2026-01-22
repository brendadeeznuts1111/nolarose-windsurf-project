#!/usr/bin/env bun

// test-ai-simple.js - Simple test for Nebula-Flow™ AI
// Quick verification that the AI system works

import { AnomalyEngine } from './ai/anomalyEngine.js';

console.log("🧪 Simple AI Test - Starting");

async function testAI() {
    const engine = new AnomalyEngine();
    
    // Test 1: Low risk leg
    console.log("📊 Testing low risk leg...");
    const lowRisk = await engine.scoreLeg({
        deviceId: 'test_low_risk',
        ageDays: 180,
        legAmount: 500,
        legVelocity: 5,
        ipJump: 1,
        walletAgeDelta: 90,
        ctrProximity: 5000,
        chargebackHistory: false,
        sessionDuration: 30,
        geoMismatch: false,
        deviceRiskScore: 0.2
    });
    
    console.log(`✅ Low risk: Score ${lowRisk.score.toFixed(3)}, Code ${lowRisk.nebulaCode}, Recommendation ${lowRisk.recommendation}`);
    
    // Test 2: High risk leg
    console.log("📊 Testing high risk leg...");
    const highRisk = await engine.scoreLeg({
        deviceId: 'test_high_risk',
        ageDays: 1,
        legAmount: 8000,
        legVelocity: 150,
        ipJump: 15,
        walletAgeDelta: 5,
        ctrProximity: 500,
        chargebackHistory: true,
        sessionDuration: 5,
        geoMismatch: true,
        deviceRiskScore: 0.9
    });
    
    console.log(`✅ High risk: Score ${highRisk.score.toFixed(3)}, Code ${highRisk.nebulaCode}, Recommendation ${highRisk.recommendation}`);
    
    // Test 3: Get stats
    console.log("📊 Testing engine stats...");
    const stats = engine.getStats();
    console.log(`✅ Stats: Version ${stats.version}, Features ${stats.features}, Model Initialized ${stats.modelInitialized}`);
    
    console.log("🎉 All AI tests passed!");
}

testAI().catch(console.error);
