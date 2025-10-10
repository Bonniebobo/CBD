#!/bin/bash

# AI Code Assistant Backend Deployment Script
# This script helps deploy the backend to various platforms

set -e

echo "🚀 AI Code Assistant Backend Deployment Helper"
echo "=============================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    echo "❌ Node.js version 16+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Run tests
echo "🧪 Running tests..."
npm test

echo ""
echo "🎉 Backend is ready for deployment!"
echo ""
echo "📋 Deployment Options:"
echo ""
echo "1. 🏠 Local Development:"
echo "   npm start"
echo "   Server will run on http://localhost:3001"
echo ""
echo "2. ☁️  Render (Recommended for beginners):"
echo "   - Go to https://render.com"
echo "   - Connect your GitHub repository"
echo "   - Set build command: npm install"
echo "   - Set start command: npm start"
echo "   - Deploy!"
echo ""
echo "3. 🚀 Heroku:"
echo "   - Install Heroku CLI"
echo "   - heroku create your-app-name"
echo "   - git push heroku main"
echo ""
echo "4. 🏗️  AWS EC2:"
echo "   - Launch Ubuntu 20.04 instance"
echo "   - Install Node.js 18+"
echo "   - Clone repository"
echo "   - npm install && npm start"
echo "   - Use PM2 for process management"
echo ""
echo "5. 🐳 Docker:"
echo "   - docker build -t ai-backend ."
echo "   - docker run -p 3001:3001 ai-backend"
echo ""
echo "📝 After deployment:"
echo "   - Update your VS Code extension to use the deployed URL"
echo "   - Test the integration"
echo "   - Monitor logs for any issues"
echo ""
echo "🔧 Environment Variables:"
echo "   - PORT: Server port (default: 3001)"
echo "   - NODE_ENV: production/development"
echo ""
echo "📊 Health Check:"
echo "   - GET /health - Server health status"
echo "   - GET /upload - File upload endpoint"
echo ""
echo "✨ Happy coding!"
