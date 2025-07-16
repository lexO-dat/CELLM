#!/bin/bash

# CELLM Supabase Authentication Test Script
# This script helps verify that the authentication system is properly configured

echo "🚀 CELLM Supabase Authentication Test"
echo "=====================================\n"

# Check if environment variables are set
echo "1. Checking environment variables..."
cd /home/lexo/dev/CELLM/frontend

if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Check if Supabase URL is set
    if grep -q "VITE_SUPABASE_URL=https://your-project-id.supabase.co" .env; then
        echo "❌ VITE_SUPABASE_URL is still using placeholder value"
        echo "   Please update .env with your actual Supabase project URL"
    else
        echo "✅ VITE_SUPABASE_URL appears to be configured"
    fi
    
    # Check if Supabase key is set
    if grep -q "VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.your-anon-key-here" .env; then
        echo "❌ VITE_SUPABASE_ANON_KEY is still using placeholder value"
        echo "   Please update .env with your actual Supabase anon key"
    else
        echo "✅ VITE_SUPABASE_ANON_KEY appears to be configured"
    fi
else
    echo "❌ .env file not found"
    echo "   Please create .env file with your Supabase configuration"
fi

echo "\n2. Checking dependencies..."
if [ -f "package.json" ]; then
    if grep -q "@supabase/supabase-js" package.json; then
        echo "✅ @supabase/supabase-js dependency found"
    else
        echo "❌ @supabase/supabase-js dependency not found"
        echo "   Run: npm install @supabase/supabase-js"
    fi
else
    echo "❌ package.json not found"
fi

echo "\n3. Running TypeScript check..."
if npm run typecheck; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
fi

echo "\n4. Checking authentication files..."
AUTH_FILES=(
    "src/lib/supabase.ts"
    "src/contexts/AuthContext.tsx"
    "src/components/Auth/LoginPage.tsx"
    "src/components/Auth/ResetPasswordPage.tsx"
)

for file in "${AUTH_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file found"
    else
        echo "❌ $file not found"
    fi
done

echo "\n📝 Next Steps:"
echo "1. Create a Supabase project at https://supabase.com"
echo "2. Update .env with your actual Supabase URL and anon key"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Test the authentication flow:"
echo "   - Visit http://localhost:5173/login"
echo "   - Try registering a new user"
echo "   - Try logging in"
echo "   - Try password reset"
echo "   - Verify user-specific chat history"

echo "\n🔗 For detailed setup instructions, see:"
echo "   /home/lexo/dev/CELLM/frontend/SUPABASE_AUTH_SETUP.md"

echo "\n✨ Authentication system is ready for configuration!"
