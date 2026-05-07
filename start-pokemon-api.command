#!/bin/bash

DIR="$(cd "$(dirname "$0")" && pwd)"

echo "================================"
echo "   Pokemon API - Starting up..."
echo "================================"

# Kill any already-running instances
pkill -f "services/pokemon/index.js" 2>/dev/null
pkill -f "services/types/index.js" 2>/dev/null
pkill -f "gateway/index.js" 2>/dev/null
sleep 1

node "$DIR/src/services/pokemon/index.js" &> /tmp/pokemon-service.log &
POKEMON_PID=$!

node "$DIR/src/services/types/index.js" &> /tmp/types-service.log &
TYPES_PID=$!

node "$DIR/src/gateway/index.js" &> /tmp/api-gateway.log &
GATEWAY_PID=$!

sleep 2

echo ""
echo "  Pokemon Service  →  http://localhost:3001"
echo "  Types Service    →  http://localhost:3002"
echo "  API Gateway      →  http://localhost:3000"
echo ""
echo "  PIDs: pokemon=$POKEMON_PID  types=$TYPES_PID  gateway=$GATEWAY_PID"
echo ""
echo "  Press Ctrl+C to stop all services."
echo "================================"

# Keep the window open and shut everything down cleanly on exit
trap "kill $POKEMON_PID $TYPES_PID $GATEWAY_PID 2>/dev/null; echo 'Services stopped.'" EXIT

wait
