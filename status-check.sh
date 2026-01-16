#!/bin/bash
# Status Check Script untuk Logbook Application

echo "================================================"
echo "📔 Website Pencatatan Logbook - Status Check"
echo "================================================"
echo ""

# Check Node.js
echo "✓ Checking Node.js installation..."
if command -v node &> /dev/null; then
    echo "  Node.js version: $(node --version)"
else
    echo "  ✗ Node.js NOT installed"
fi
echo ""

# Check npm
echo "✓ Checking npm installation..."
if command -v npm &> /dev/null; then
    echo "  npm version: $(npm --version)"
else
    echo "  ✗ npm NOT installed"
fi
echo ""

# Check MySQL
echo "✓ Checking MySQL installation..."
if command -v mysql &> /dev/null; then
    echo "  ✓ MySQL found"
else
    echo "  ⚠ MySQL command not in PATH (but XAMPP MySQL may be running)"
fi
echo ""

# Check project files
echo "✓ Checking project files..."
if [ -f ".env.local" ]; then
    echo "  ✓ .env.local exists"
else
    echo "  ✗ .env.local missing"
fi

if [ -f "package.json" ]; then
    echo "  ✓ package.json exists"
else
    echo "  ✗ package.json missing"
fi

if [ -d "node_modules" ]; then
    echo "  ✓ node_modules exists"
else
    echo "  ✗ node_modules missing - run 'npm install'"
fi

if [ -d ".next" ]; then
    echo "  ✓ .next build cache exists"
else
    echo "  ⚠ .next build cache missing (will be created on first run)"
fi
echo ""

# Check documentation
echo "✓ Checking documentation files..."
docs=("QUICKSTART.md" "PANDUAN.md" "DEPLOYMENT.md" "TESTING.md" "PROJECT_INFO.md" "COMPLETION_REPORT.md" "README.md" "INDEX.md")
for doc in "${docs[@]}"; do
    if [ -f "$doc" ]; then
        echo "  ✓ $doc"
    else
        echo "  ✗ $doc missing"
    fi
done
echo ""

echo "================================================"
echo "📋 Quick Start Commands:"
echo "================================================"
echo ""
echo "Start development server:"
echo "  npm run dev"
echo ""
echo "Build for production:"
echo "  npm run build"
echo ""
echo "Run production server:"
echo "  npm start"
echo ""
echo "================================================"
echo "📖 Documentation:"
echo "================================================"
echo ""
echo "1. START HERE: Read QUICKSTART.md (5 min)"
echo "2. Then: Read PANDUAN.md (30 min)"
echo "3. For Production: Read DEPLOYMENT.md"
echo "4. For Testing: Read TESTING.md"
echo "5. Quick Ref: Read README.md or INDEX.md"
echo ""
echo "Access URL: http://localhost:3000"
echo "Admin Email: admin@logbook.com"
echo "Admin Password: admin123"
echo ""
echo "================================================"
echo "✅ Status Check Complete!"
echo "================================================"
