#!/bin/bash

echo "🧹 Step 1: Removing old dependencies and caches..."

# Remove node_modules folder
echo "Removing node_modules..."
rm -rf node_modules

# Remove bun lockfile
echo "Removing bun.lockb..."
rm -f bun.lockb

# Clear bun cache
echo "Clearing bun cache..."
bun pm cache rm

# Clear Expo cache (this may show an error, that's normal)
echo "Clearing Expo cache..."
expo start -c || true

echo "✅ Step 1 completed: All caches and dependencies cleared"

echo ""
echo "🔄 Step 2: Installing dependencies..."
bun install

echo "✅ Step 2 completed: Dependencies installed"

echo ""
echo "🚀 Step 3: Starting the application..."
bun expo start --web --tunnel

echo "✅ Setup complete! Your app should now start without Metro errors."