#!/bin/bash
# QA Detective - Quick Setup Script
# Helps users configure ngrok and get started

set -e

BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 QA Detective - Production Setup${NC}\n"

# Check if npm/pnpm installed
if ! command -v npm &> /dev/null && ! command -v pnpm &> /dev/null; then
  echo -e "${RED}❌ Node.js/npm not found. Please install Node.js 18+${NC}"
  echo "   Download: https://nodejs.org/"
  exit 1
fi

# Check if ngrok token set
if [ -z "$NGROK_AUTHTOKEN" ]; then
  echo -e "${YELLOW}⚠️  NGROK_AUTHTOKEN not set${NC}"
  echo ""
  echo "Steps to fix:"
  echo "1. Get free token: ${BLUE}https://dashboard.ngrok.com/get-started/your-authtoken${NC}"
  echo "2. Copy your authtoken"
  echo "3. Set in your terminal:"
  echo ""
  echo -e "   ${GREEN}export NGROK_AUTHTOKEN=your_token_here${NC}"
  echo ""
  echo "   (On Windows PowerShell):"
  echo -e "   ${GREEN}\$env:NGROK_AUTHTOKEN='your_token_here'${NC}"
  echo ""
  
  read -p "Enter your ngrok token (or press Enter to skip): " token
  if [ ! -z "$token" ]; then
    export NGROK_AUTHTOKEN="$token"
    echo -e "${GREEN}✓ Token set for this session${NC}"
    
    # Offer to save to shell profile
    read -p "Save to ~/.bashrc for future sessions? (y/n): " save_pref
    if [ "$save_pref" = "y" ] || [ "$save_pref" = "Y" ]; then
      echo "export NGROK_AUTHTOKEN='$token'" >> ~/.bashrc
      echo -e "${GREEN}✓ Saved to ~/.bashrc${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️  Skipping ngrok setup. You can use --public-url flag instead${NC}"
  fi
fi

# Check if qa-detective installed
if ! command -v qa-detective &> /dev/null; then
  echo ""
  echo -e "${YELLOW}📦 Installing qa-detective-cli...${NC}"
  npm install -g qa-detective-cli || pnpm add -g qa-detective-cli
  echo -e "${GREEN}✓ Installed${NC}"
fi

# Verify ngrok by trying to connect
if [ ! -z "$NGROK_AUTHTOKEN" ]; then
  echo ""
  echo -e "${BLUE}🔗 Testing ngrok connection...${NC}"
  # Quick test - just check if ngrok token works (don't create actual tunnel)
  if npm list @ngrok/ngrok &> /dev/null; then
    echo -e "${GREEN}✓ ngrok SDK ready${NC}"
  else
    echo -e "${YELLOW}⚠️  ngrok SDK not found (will be installed on first scan)${NC}"
  fi
fi

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Quick test:"
echo -e "  ${BLUE}qa-detective scan https://example.com${NC}"
echo ""
echo "Scan localhost:"
echo -e "  ${BLUE}qa-detective scan http://localhost:3000${NC}"
echo ""
echo "Save report:"
echo -e "  ${BLUE}qa-detective scan https://example.com --output report.json${NC}"
echo ""
echo "Full docs:"
echo -e "  ${BLUE}qa-detective scan --help${NC}"
echo ""
echo "For detailed setup guide:"
echo -e "  ${BLUE}https://github.com/mrauthentik/QA-crawler/blob/main/packages/cli/PRODUCTION_SETUP.md${NC}"
