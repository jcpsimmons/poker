#!/bin/bash

echo "🎴 Poker Planning - Development Mode"
echo "====================================="
echo ""
echo "📝 Instructions:"
echo "   1. In this terminal: Go server will run on port 9867"
echo "   2. In another terminal: cd web && npm run dev"
echo "   3. React dev server will run on port 5173"
echo "   4. Update JoinPage server URL to: ws://localhost:9867/ws"
echo ""
echo "🚀 Starting Go server..."
echo ""

go run main.go server --port 9867

