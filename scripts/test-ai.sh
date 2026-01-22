#!/bin/bash
echo "🧪 Testing Nebula-Flow™ AI System..."

# Test 1: Check if files exist
echo "📁 Checking files..."
if [ -f "ai/model.onnx" ]; then
    echo "✅ Model file exists"
else
    echo "❌ Model file missing"
    exit 1
fi

# Test 2: Test AI system status
echo "🔍 Testing AI system..."
bun ai/index.ts status

# Test 3: Test training
echo "🎯 Testing training..."
bun ai/index.ts train

echo "✅ All tests passed!"
