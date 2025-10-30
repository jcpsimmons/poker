#!/bin/bash
set -e

echo "================================"
echo "Running Go tests..."
echo "================================"
go test -v -race ./server/... ./types/... ./messaging/...

echo ""
echo "================================"
echo "Building server..."
echo "================================"
cd web && npm i && npm run build && cd ..
go build -o poker

echo ""
echo "================================"
echo "Starting server..."
echo "================================"
./poker server &
SERVER_PID=$!

echo "Waiting for server to be ready..."
npx -y wait-on http://localhost:9867 --timeout 30000

echo ""
echo "================================"
echo "Running E2E tests..."
echo "================================"
cd e2e && npm i && npx -y playwright install chromium && CI=true npm test

echo ""
echo "================================"
echo "Cleaning up..."
echo "================================"
kill $SERVER_PID
wait $SERVER_PID 2>/dev/null || true

echo ""
echo "================================"
echo "All tests completed successfully!"
echo "================================"

