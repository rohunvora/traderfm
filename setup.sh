#!/bin/bash

echo "🚀 Setting up TraderFM..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16+ first."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install root dependencies
echo -e "\n${YELLOW}Installing root dependencies...${NC}"
npm install

# Install frontend dependencies
echo -e "\n${YELLOW}Installing frontend dependencies...${NC}"
cd frontend
npm install
cd ..

# Install backend dependencies
echo -e "\n${YELLOW}Installing backend dependencies...${NC}"
cd backend
npm install

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "\n${YELLOW}Creating .env file...${NC}"
    cp env.example .env
    echo -e "${GREEN}✅ .env file created. Please update it with your settings.${NC}"
else
    echo -e "\n${GREEN}✅ .env file already exists${NC}"
fi

# Initialize database
echo -e "\n${YELLOW}Initializing database...${NC}"
npm run db:init

cd ..

echo -e "\n${GREEN}✅ Setup complete!${NC}"
echo -e "\nTo start development servers:"
echo -e "  ${YELLOW}npm run dev${NC}"
echo -e "\nOr start them separately:"
echo -e "  Backend: ${YELLOW}cd backend && npm run dev${NC}"
echo -e "  Frontend: ${YELLOW}cd frontend && npm run dev${NC}" 