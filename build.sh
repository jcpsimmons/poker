#!/bin/bash
set -e

echo "🎴 Building Poker Planning App"
echo "==============================="
echo ""

# Build React app
echo "📦 Building React app..."
cd web
npm run build
cd ..
echo "✅ React app built successfully!"
echo ""

# Build Go binary
echo "🔨 Building Go binary..."
go build -o poker
echo "✅ Go binary built successfully!"
echo ""

echo "🎉 Build complete!"
echo ""
echo "To run:"
echo "  ./poker server"
echo ""
echo "Then open your browser to:"
echo "  http://localhost:9867"

