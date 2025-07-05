#!/bin/bash

# CELLM LLM Setup Script
# This script helps set up the LLM environment for both local and API usage

set -e

echo "CELLM LLM Setup"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check Python
if ! command_exists python3; then
    echo "Python 3 is required but not installed."
    exit 1
fi

echo "Python 3 found"

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ".env file created. Please edit it with your API keys and preferences."
else
    echo ".env file already exists"
fi

# Make config script executable
chmod +x llm_config.py

echo ""
echo "Setup Complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your API keys (if using API models)"
echo "2. Configure your preferred providers:"
echo "   ./llm_config.py --setup    # Interactive setup"
echo "   ./llm_config.py --status   # Check current config"
echo ""
echo "Quick presets:"
echo "   ./llm_config.py --preset all-local   # Use local Ollama for everything"
echo "   ./llm_config.py --preset all-api     # Use APIs for everything"
echo ""
echo "3. Start the service:"
echo "   python Ollama_gateway.py"
echo ""
