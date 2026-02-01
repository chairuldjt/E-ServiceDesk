#!/bin/bash

# Exit on error
set -e

echo "🚀 Memulai proses deploy..."

# 1. Git pull
echo "📥 Pulling latest changes from main..."
git pull origin main

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Initialize/update database schema
echo "🗄️ Updating database schema..."
npm run db:init

# 4. Build the application
echo "🏗️ Building the application..."
npm run build

# 5. Reload PM2 process
echo "🔄 Reloading PM2 process 'eservicedesk'..."
pm2 reload eservicedesk

echo "✅ Deployment selesai dengan sukses!"
