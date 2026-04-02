#!/bin/sh
set -e

echo "🔨 Claude Buddy Forge Installer"
echo ""

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Node.js is required but not installed."
  echo "   Install from: https://nodejs.org/"
  exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. You have $(node -v)"
  exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install globally
echo "📦 Installing claude-buddy-forge..."
npm install -g claude-buddy-forge

echo ""
echo "✅ Installation complete!"
echo ""
echo "Run with:"
echo "  claude-buddy-forge          # Interactive guided mode"
echo "  claude-buddy-forge catalog  # Browse species grid"
echo ""
