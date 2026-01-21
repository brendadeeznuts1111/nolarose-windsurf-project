#!/bin/bash

# Console Depth <N> Testing Script
# Demonstrates how different N values affect object inspection

echo "🎯 --console-depth <N> Comprehensive Demonstration"
echo "=================================================="
echo ""

# Test different depth levels
depths=(0 1 2 3 4 5 7 10)

for depth in "${depths[@]}"; do
    echo "📊 Testing --console-depth $depth:"
    echo "----------------------------------------"
    
    if [ "$depth" -eq 0 ]; then
        echo "Depth 0: No object expansion (minimal output)"
        bun --console-depth 0 run console-depth-demo.js 2>/dev/null | head -10
    elif [ "$depth" -eq 1 ]; then
        echo "Depth 1: Shallow - only top level properties"
        bun --console-depth 1 run console-depth-demo.js 2>/dev/null | head -15
    elif [ "$depth" -eq 2 ]; then
        echo "Depth 2: Default Bun behavior"
        bun --console-depth 2 run console-depth-demo.js 2>/dev/null | head -20
    elif [ "$depth" -eq 3 ]; then
        echo "Depth 3: Good for most configurations"
        bun --console-depth 3 run console-depth-demo.js 2>/dev/null | head -25
    elif [ "$depth" -eq 4 ]; then
        echo "Depth 4: Complex configuration visibility"
        bun --console-depth 4 run console-depth-demo.js 2>/dev/null | head -30
    elif [ "$depth" -eq 5 ]; then
        echo "Depth 5: Deep debugging capability"
        bun --console-depth 5 run console-depth-demo.js 2>/dev/null | head -35
    elif [ "$depth" -eq 7 ]; then
        echo "Depth 7: Very deep inspection"
        bun --console-depth 7 run console-depth-demo.js 2>/dev/null | head -40
    elif [ "$depth" -eq 10 ]; then
        echo "Depth 10: Maximum inspection (very verbose)"
        bun --console-depth 10 run console-depth-demo.js 2>/dev/null | head -45
    fi
    
    echo ""
    echo "Press Enter to continue to next depth level..."
    read -r
    echo ""
done

echo "🎉 Console Depth Testing Complete!"
echo ""
echo "💡 Usage Examples:"
echo "  bun --console-depth 1 run script.js     # Shallow view"
echo "  bun --console-depth 4 run script.js     # Complex configs"
echo "  bun --console-depth 10 run script.js    # Maximum depth"
echo ""
echo "🔧 CLI Integration:"
echo "  bun run cli:matrix      # Uses depth 4"
echo "  bun run cli:network     # Uses depth 3"
echo "  bun run cli:analyze     # Uses depth 5"
