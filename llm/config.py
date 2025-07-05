import os
from enum import Enum
from typing import Dict, Any
from dotenv import load_dotenv

load_dotenv()

class LLMProvider(Enum):
    LOCAL = "local"
    API = "api"

class Config:

    # Default provider selection
    UCF_PROVIDER = os.getenv("UCF_PROVIDER", "local")  # "local" or "api"
    VERILOG_PROVIDER = os.getenv("VERILOG_PROVIDER", "local")  # "local" or "api"
    
    # Supabase Configuration
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    # Local Ollama Configuration
    OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    
    # Local Models
    LOCAL_UCF_MODEL = os.getenv("LOCAL_UCF_MODEL", "phi4")
    LOCAL_VERILOG_MODEL = os.getenv("LOCAL_VERILOG_MODEL", "verilog-r1-32b")
    LOCAL_EMBEDDING_MODEL = os.getenv("LOCAL_EMBEDDING_MODEL", "mxbai-embed-large:latest")
    
    # OPENAI API Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAI_UCF_MODEL = os.getenv("OPENAI_UCF_MODEL", "gpt-4o-mini")
    
    # DeepSeek API Configuration
    DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
    DEEPSEEK_VERILOG_MODEL = os.getenv("DEEPSEEK_VERILOG_MODEL", "deepseek-reasoner")
    DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com")
    
    @classmethod
    def validate_api_config(cls) -> Dict[str, bool]:
        """Validate API configuration"""
        validation = {
            "openai_ready": bool(cls.OPENAI_API_KEY),
            "deepseek_ready": bool(cls.DEEPSEEK_API_KEY),
            "supabase_ready": bool(cls.SUPABASE_URL and cls.SUPABASE_KEY)
        }
        return validation
    
    # Get UCF model configuration
    @classmethod
    def get_ucf_config(cls) -> Dict[str, Any]:
        if cls.UCF_PROVIDER == "api":
            return {
                "provider": "openai",
                "api_key": cls.OPENAI_API_KEY,
                "model": cls.OPENAI_UCF_MODEL,
                "temperature": 0.1
            }
        else:
            return {
                "provider": "ollama",
                "base_url": cls.OLLAMA_BASE_URL,
                "model": cls.LOCAL_UCF_MODEL,
                "temperature": 0.1
            }
    
    # Get Verilog model configuration
    @classmethod
    def get_verilog_config(cls) -> Dict[str, Any]:
        if cls.VERILOG_PROVIDER == "api":
            return {
                "provider": "deepseek",
                "api_key": cls.DEEPSEEK_API_KEY,
                "base_url": cls.DEEPSEEK_BASE_URL,
                "model": cls.DEEPSEEK_VERILOG_MODEL,
                "temperature": 0.3
            }
        else:
            return {
                "provider": "ollama",
                "base_url": cls.OLLAMA_BASE_URL,
                "model": cls.LOCAL_VERILOG_MODEL,
                "temperature": 0.3
            }
    
    # Print current configuration status
    @classmethod
    def print_config_status(cls):
        print(f"UCF Provider: {cls.UCF_PROVIDER}")
        print(f"Verilog Provider: {cls.VERILOG_PROVIDER}")
        
        validation = cls.validate_api_config()
        print(f"OpenAI Ready: {validation['openai_ready']}")
        print(f"DeepSeek Ready: {validation['deepseek_ready']}")
        print(f"Supabase Ready: {validation['supabase_ready']}")
        
        ucf_config = cls.get_ucf_config()
        verilog_config = cls.get_verilog_config()
        
        print(f"UCF Model: {ucf_config['provider']} - {ucf_config['model']}")
        print(f"Verilog Model: {verilog_config['provider']} - {verilog_config['model']}")
