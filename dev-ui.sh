#!/bin/bash

# Exit on error
set -e

echo "🎴 Poker Planning - UI Dev Mode"
echo "=================================="
echo ""

# Cleanup function to kill background processes
cleanup() {
    echo ""
    echo "🛑 Shutting down servers..."
    jobs -p | xargs -r kill 2>/dev/null || true
    exit 0
}

# Trap Ctrl+C and other termination signals
trap cleanup SIGINT SIGTERM EXIT

echo "🔨 Building Go binary (one time)..."
go build -o poker main.go
echo "✅ Go binary built"
echo ""

echo "🚀 Starting Go WebSocket server on port 9867..."
# Pass through all arguments to the poker server command
./poker server --port 9867 "$@" &
GO_PID=$!
echo "   PID: $GO_PID"
echo ""

# Wait for Go server to start
sleep 2

echo "⚡ Starting Vite dev server with HMR..."
cd web && npm run dev &
VITE_PID=$!
echo "   PID: $VITE_PID"
echo ""

sleep 3

echo "✅ Dev environment ready!"
echo ""
echo "📍 URLs:"
echo "   Frontend (HMR): http://localhost:5173 or http://localhost:5174"
echo "   Backend (WS):   ws://localhost:9867/ws"
echo ""
echo "💡 The frontend auto-detects the WebSocket URL"
echo "   Make changes in web/src/ and see them instantly!"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

# Wait for background processes
wait

