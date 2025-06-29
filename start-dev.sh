#!/bin/bash

# OpenAdvisor Development Server Startup Script

echo "🚀 Starting OpenAdvisor Development Servers..."

# Default ports
BACKEND_PORT=${BACKEND_PORT:-5001}
FRONTEND_PORT=${FRONTEND_PORT:-5173}

echo "📡 Backend will run on port: $BACKEND_PORT"
echo "🎨 Frontend will run on port: $FRONTEND_PORT"
echo ""

# Kill any existing processes on these ports
echo "🧹 Cleaning up existing processes..."
lsof -ti:$BACKEND_PORT | xargs kill -9 2>/dev/null
lsof -ti:$FRONTEND_PORT | xargs kill -9 2>/dev/null

# Start backend
echo "🔧 Starting backend server..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo "🎨 Starting frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ Servers are starting up!"
echo ""
echo "🌐 OpenAdvisor will be available at:"
echo "   Frontend: http://localhost:$FRONTEND_PORT"
echo "   Backend API: http://localhost:$BACKEND_PORT"
echo ""
echo "📝 Process IDs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 To stop servers, press Ctrl+C or run: kill $BACKEND_PID $FRONTEND_PID"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID 