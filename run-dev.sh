#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
echo "Starting FarmPro dev environment from $ROOT_DIR"

echo "Installing backend dependencies..."
cd "$ROOT_DIR/backend"
npm install
echo "Starting backend in background..."
npm run start &
BACKEND_PID=$!

echo "Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install
echo "Starting frontend in background..."
npm start &
FRONTEND_PID=$!

echo "Backend PID: $BACKEND_PID  Frontend PID: $FRONTEND_PID"
wait
