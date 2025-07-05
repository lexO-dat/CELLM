#!/usr/bin/env python3
"""
CELLM LLM Configuration Manager
Easily switch between local and API LLM providers
"""
import os
import sys
import argparse
from config import Config

# Display current configuration status
def show_status():
    config = Config()
    print("CELLM LLM Configuration Status")
    
    print(f"UCF Provider: {config.UCF_PROVIDER}")
    if config.UCF_PROVIDER == "api":
        print(f"  ├── Model: {config.OPENAI_UCF_MODEL}")
        print(f"  └── API Key: {'Set' if config.OPENAI_API_KEY else 'Missing'}")
    else:
        print(f"  ├── Model: {config.LOCAL_UCF_MODEL}")
        print(f"  └── Ollama URL: {config.OLLAMA_BASE_URL}")
    
    print(f"\nVerilog Provider: {config.VERILOG_PROVIDER}")
    if config.VERILOG_PROVIDER == "api":
        print(f"  ├── Model: {config.DEEPSEEK_VERILOG_MODEL}")
        print(f"  └── API Key: {'Set' if config.DEEPSEEK_API_KEY else 'Missing'}")
    else:
        print(f"  ├── Model: {config.LOCAL_VERILOG_MODEL}")
        print(f"  └── Ollama URL: {config.OLLAMA_BASE_URL}")
    
    validation = config.validate_api_config()
    print(f"\nAPI Readiness:")
    print(f"  ├── OpenAI: {'Ready' if validation['openai_ready'] else 'Not configured'}")
    print(f"  ├── DeepSeek: {'Ready' if validation['deepseek_ready'] else 'Not configured'}")
    print(f"  └── Supabase: {'Ready' if validation['supabase_ready'] else 'Not configured'}")
    print("="*50)

# Set LLM providers
def set_provider(ucf_provider=None, verilog_provider=None):
    env_file = ".env"
    env_lines = []
    
    # Read existing .env file
    if os.path.exists(env_file):
        with open(env_file, 'r') as f:
            env_lines = f.readlines()
    
    # Update or add provider settings
    ucf_updated = False
    verilog_updated = False
    
    for i, line in enumerate(env_lines):
        if line.startswith("UCF_PROVIDER=") and ucf_provider:
            env_lines[i] = f"UCF_PROVIDER={ucf_provider}\n"
            ucf_updated = True
        elif line.startswith("VERILOG_PROVIDER=") and verilog_provider:
            env_lines[i] = f"VERILOG_PROVIDER={verilog_provider}\n"
            verilog_updated = True
    
    # Add new lines if not found
    if ucf_provider and not ucf_updated:
        env_lines.append(f"UCF_PROVIDER={ucf_provider}\n")
    if verilog_provider and not verilog_updated:
        env_lines.append(f"VERILOG_PROVIDER={verilog_provider}\n")
    
    # Write back to .env file
    with open(env_file, 'w') as f:
        f.writelines(env_lines)
    
    print("Configuration updated!")
    if ucf_provider:
        print(f"   UCF Provider: {ucf_provider}")
    if verilog_provider:
        print(f"   Verilog Provider: {verilog_provider}")
    print("   Restart the Ollama gateway to apply changes.")

# Interactive configuration setup
def interactive_setup():
    print("\nCELLM LLM Interactive Setup")
    
    # UCF Provider
    print("\n1. UCF Selection Model:")
    print("   local  - Use local Ollama (phi4)")
    print("   api    - Use OpenAI API (gpt-4o-mini)")
    
    while True:
        ucf_choice = input("\nChoose UCF provider [local/api]: ").strip().lower()
        if ucf_choice in ["local", "api"]:
            break
        print("Please enter 'local' or 'api'")
    
    # Verilog Provider
    print("\n2. Verilog Generation Model:")
    print("   local  - Use local Ollama (verilog-r1-32b)")
    print("   api    - Use DeepSeek R1 API (deepseek-reasoner)")
    
    while True:
        verilog_choice = input("\nChoose Verilog provider [local/api]: ").strip().lower()
        if verilog_choice in ["local", "api"]:
            break
        print("Please enter 'local' or 'api'")

    # Apply configuration
    set_provider(ucf_choice, verilog_choice)
    
    # Show next steps
    print("\nNext Steps:")
    if ucf_choice == "api" or verilog_choice == "api":
        print("   1. Set up your API keys in .env file:")
        if ucf_choice == "api":
            print("      OPENAI_API_KEY=your_openai_key_here")
        if verilog_choice == "api":
            print("      DEEPSEEK_API_KEY=your_deepseek_key_here")
        print("   2. Restart the Ollama gateway")
    else:
        print("   1. Make sure Ollama is running: ollama serve")
        print("   2. Restart the Ollama gateway")

def main():
    parser = argparse.ArgumentParser(description="CELLM LLM Configuration Manager")
    parser.add_argument("--status", "-s", action="store_true", help="Show current configuration status")
    parser.add_argument("--ucf", choices=["local", "api"], help="Set UCF provider")
    parser.add_argument("--verilog", choices=["local", "api"], help="Set Verilog provider")
    parser.add_argument("--setup", action="store_true", help="Interactive setup")
    parser.add_argument("--preset", choices=["all-local", "all-api"], 
                       help="Apply preset configuration")
    
    args = parser.parse_args()
    
    if args.status:
        show_status()
    elif args.setup:
        interactive_setup()
    elif args.preset:
        if args.preset == "all-local":
            set_provider("local", "local")
        elif args.preset == "all-api":
            set_provider("api", "api")
    elif args.ucf or args.verilog:
        set_provider(args.ucf, args.verilog)
    else:
        show_status()
        print("\nUse --help for available commands")

if __name__ == "__main__":
    main()
