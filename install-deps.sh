#!/bin/bash

# Natal Chart App - Dependency Installation Script
# This script installs Node.js, npm, and pnpm for the natal-chart project

set -e  # Exit on error

echo "🔧 Natal Chart App - Dependency Installation"
echo "==========================================="

# Check if running as root (we'll use sudo where needed)
if [ "$EUID" -eq 0 ]; then
  echo "⚠️  Please don't run this script as root. It will use sudo where needed."
  exit 1
fi

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Check for existing Node.js installation
if command_exists node; then
  NODE_VERSION=$(node --version)
  echo "✅ Node.js is already installed: $NODE_VERSION"
  
  # Check if version is >= 18
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d'.' -f1 | tr -d 'v')
  if [ "$NODE_MAJOR" -ge 18 ]; then
    echo "✅ Node.js version is compatible (>= 18.x)"
  else
    echo "⚠️  Node.js version is too old. Installing Node.js 20.x..."
    INSTALL_NODE=true
  fi
else
  echo "📦 Node.js not found. Installing Node.js 20.x..."
  INSTALL_NODE=true
fi

# Install Node.js if needed
if [ "$INSTALL_NODE" = true ]; then
  echo "📥 Installing Node.js 20.x..."
  
  # Add NodeSource repository
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  
  # Install Node.js
  sudo apt-get install -y nodejs
  
  # Verify installation
  if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js installed successfully: $NODE_VERSION"
  else
    echo "❌ Failed to install Node.js"
    exit 1
  fi
fi

# Check for npm
if command_exists npm; then
  NPM_VERSION=$(npm --version)
  echo "✅ npm is already installed: v$NPM_VERSION"
else
  echo "❌ npm not found after Node.js installation"
  exit 1
fi

# Check for pnpm
if command_exists pnpm; then
  PNPM_VERSION=$(pnpm --version)
  echo "✅ pnpm is already installed: v$PNPM_VERSION"
else
  echo "📥 Installing pnpm globally..."
  sudo npm install -g pnpm
  
  if command_exists pnpm; then
    PNPM_VERSION=$(pnpm --version)
    echo "✅ pnpm installed successfully: v$PNPM_VERSION"
  else
    echo "❌ Failed to install pnpm"
    exit 1
  fi
fi

echo ""
echo "✅ All dependencies installed successfully!"
echo ""
echo "Next steps:"
echo "1. Install project dependencies:"
echo "   cd /home/john/src/natal-chart"
echo "   pnpm install"
echo ""
echo "2. Run the swisseph-wasm spike test (CRITICAL):"
echo "   pnpm --filter core test:spike"
echo ""
echo "3. Start development server:"
echo "   pnpm dev"
echo ""

# Offer to run pnpm install automatically
read -p "Would you like to run 'pnpm install' now? (y/n): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo "📦 Installing project dependencies..."
  pnpm install
  
  if [ $? -eq 0 ]; then
    echo "✅ Project dependencies installed successfully!"
    echo ""
    echo "You can now run the spike test:"
    echo "  pnpm --filter core test:spike"
  else
    echo "❌ Failed to install project dependencies"
    exit 1
  fi
fi

echo ""
echo "✨ Installation complete! ✨"