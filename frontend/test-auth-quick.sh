#!/bin/bash

# Quick test to verify the authentication system is working
echo "🔍 Testing CELLM Authentication System"
echo "======================================"

# Check if the dev server is running
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Development server is running at http://localhost:3000"
    echo "✅ Login page should be available at http://localhost:3000/login"
    echo "✅ Environment variables are properly loaded"
else
    echo "❌ Development server is not running"
    echo "   Please run: npm run dev"
fi

echo ""
echo "🧪 Manual Test Steps:"
echo "1. Open http://localhost:3000/login in your browser"
echo "2. Try to register a new user account"
echo "3. Check browser console for any errors"
echo "4. If registration works, try logging in"
echo "5. Verify that you're redirected to the main chat interface"

echo ""
echo "🔧 If you encounter issues:"
echo "1. Check browser console for error messages"
echo "2. Verify Supabase project is active and accessible"
echo "3. Confirm authentication is enabled in Supabase dashboard"
echo "4. Check network tab for failed API calls"

echo ""
echo "📱 Test Authentication Features:"
echo "- User registration with email"
echo "- Email/password login"
echo "- Password reset functionality"
echo "- Session persistence (refresh page)"
echo "- User-specific chat history"
echo "- Secure logout"
