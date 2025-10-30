#!/bin/bash

echo "🎴 Poker Planning - Development Mode"
echo "====================================="
echo ""
echo "📝 Instructions:"
echo "   1. This terminal runs the Go server on port 9867"
echo "   2. In another terminal: cd web && npm run dev"
echo "   3. React dev server will run on http://localhost:5173"
echo "   4. The web client auto-detects the WebSocket URL (no manual edits needed)"
echo ""
echo "🚀 Starting Go server..."
echo ""

go run main.go server --port 9867
