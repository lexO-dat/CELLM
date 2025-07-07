from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.chains import ConversationChain
from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.chains import ConversationalRetrievalChain
from supabase import create_client, Client
from langchain_core.messages import HumanMessage
from dotenv import load_dotenv
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from typing import Dict
import re

# Import the llm configuration and LLM manager
from config import Config
from llm_manager import llm_manager

# -------------------------------
# API
# -------------------------------
app = FastAPI(
    title="Ollama gateway API",
    description="API for Ollama models",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

class Request(BaseModel):
    question: str

class Response(BaseModel):
    answer: str

@app.post("/v1/models/ucf", response_model=Response)
async def ucf_endpoint(request: Request) -> Dict[str, str]:
    try:
        question = (
            "what ucf you select based on this promt: " + request.question + 
            ". REMEMBER, ALWAYS RETURN ONLY THE UCF NAME, WITHOUT ANY EXPLANATION."
        )
        print(f"Received UCF question: {question}")
        response = chat_response(question)
        print(f"UCF response: {response}")
        return {"answer": response}
    except Exception as e:
        print(f"UCF endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/models/verilog", response_model=Response)
async def verilog_endpoint(request: Request) -> Dict[str, str]:
    try:
        question = f"{request.question}"
        print(f"Received Verilog question: {question}")
        response = verilog_generation(question)
        
        if not response or not isinstance(response, str):
            raise HTTPException(status_code=500, detail="Invalid Verilog code generated")
        
        return {"answer": response}
    except Exception as e:
        print(f"Verilog endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/models/health")
async def health_check():
    return {"status": "Running"}

# get the current config 
@app.get("/v1/models/config")
async def get_config():
    return {
        "ucf_provider": config.UCF_PROVIDER,
        "verilog_provider": config.VERILOG_PROVIDER,
        "ucf_config": config.get_ucf_config(),
        "verilog_config": config.get_verilog_config(),
        "validation": config.validate_api_config()
    }

class ConfigUpdateRequest(BaseModel):
    ucf_provider: str = None
    verilog_provider: str = None

# Update LLM configuration (requires restart to take effect)
@app.post("/v1/models/config")
async def update_config(request: ConfigUpdateRequest):
    try:
        updates = {}
        if request.ucf_provider and request.ucf_provider in ["local", "api"]:
            updates["UCF_PROVIDER"] = request.ucf_provider
        if request.verilog_provider and request.verilog_provider in ["local", "api"]:
            updates["VERILOG_PROVIDER"] = request.verilog_provider
        
        if not updates:
            raise HTTPException(status_code=400, detail="No valid updates provided")
        
        return {
            "message": "Configuration update received. Restart the service to apply changes.",
            "updates": updates,
            "note": "Changes require service restart to take effect"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------
# Configuration
# -------------------------------
load_dotenv()

# Initialize configuration and print status
config = Config()
config.print_config_status()

# Supabase Configuration
supabase: Client = create_client(config.SUPABASE_URL, config.SUPABASE_KEY)

# -------------------------------
# LLM Configuration (Dynamic based on config)
# -------------------------------

# Verilog prompt template (used for both local and API models)
verilog_template = """You are a Verilog code generation expert for genetic circuits. Follow these rules:
1. Always respond with complete module code blocks
2. Use proper indentation and syntax
3. Include comments for important sections
4. Validate the logic against provided truth tables
5. Wrap code in ```verilog blocks

Current conversation:
{history}
User: {input}
Assistant:"""

VERILOG_PROMPT = PromptTemplate(
    input_variables=["history", "input"], 
    template=verilog_template
)

# Get LLMs and embeddings from manager (handles both local and API models)
ucf_llm = llm_manager.get_ucf_llm()
verilog_llm = llm_manager.get_verilog_llm()
embeddings = llm_manager.get_embeddings()

print(f"Initialized embeddings: {type(embeddings).__name__}")

vector_store = SupabaseVectorStore(
    client=supabase,
    table_name="documents",
    embedding=embeddings
)

# -------------------------------
# Core Functions
# -------------------------------
def chat_response(query: str) -> str:
    """Handle UCF selection with isolated conversation context"""
    try:
        # Check if we're using API or local model
        if config.UCF_PROVIDER == "api":
            # For API models (OpenAI), use direct invocation with system prompt
            from langchain.schema import HumanMessage, SystemMessage
            
            system_prompt = """You are a specialized assistant designed to select the most appropriate UCF (User Constraint File) 
for genetic circuit design in Cello. Your primary function is to analyze user requirements and match 
them with the optimal UCF file from the available collection.

Available UCF options:
- Eco1C1G1T1
- Eco1C2G2T2
- Eco2C1G3T1
- Eco2C1G5T1
- Bth1C1G1T1
- SC1C1G1T1

Response Protocol:
- Analyze input sensors, output reporters, organism specs, logic gates, and environmental conditions
- Return ONLY THE UCF NAME in lowercase without any explanations or formatting
- If uncertain, ask for clarification but default to Eco1C1G1T1"""
            
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=f"what ucf you select based on this prompt: {query}. REMEMBER, ALWAYS RETURN ONLY THE UCF NAME, WITHOUT ANY EXPLANATION.")
            ]
            
            response = ucf_llm.invoke(messages)
            if hasattr(response, 'content'):
                answer = response.content.strip().lower()
            else:
                answer = str(response).strip().lower()
        else:
            # For local models, use retrieval chain
            memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)
            chain = ConversationalRetrievalChain.from_llm(
                llm=ucf_llm,
                retriever=vector_store.as_retriever(search_kwargs={"k": 3}),
                memory=memory,
                verbose=False
            )
            
            response = chain.invoke({"question": query})
            answer = response["answer"].strip().lower()
        
        # Validate against known UCF options
        valid_ucfs = {
            "eco1c1g1t1", "eco1c2g2t2", "eco2c1g3t1",
            "eco2c1g5t1", "bth1c1g1t1", "sc1c1g1t1"
        }
        
        match = next((ucf for ucf in valid_ucfs if ucf in answer), None)
        return match.capitalize() if match else "Eco1C1G1T1"
        
    except Exception as e:
        print(f"Chat response error: {e}")
        return "Eco1C1G1T1"

# Initialize conversation chain for local Verilog model (only if using local)
if config.VERILOG_PROVIDER == "local":
    memory_req = ConversationBufferMemory(memory_key="history")
    chain_req = ConversationChain(
            llm=verilog_llm,
            prompt=VERILOG_PROMPT,
            memory=memory_req,
            verbose=False
        )
else:
    memory_req = None
    chain_req = None

def verilog_generation(query: str) -> str:
    """Handle Verilog generation with isolated conversation context"""
    try:
        # Check if we're using API or local model
        if config.VERILOG_PROVIDER == "api":
            # For API models (DeepSeek), use direct invocation
            response = verilog_llm.invoke(query)
        else:
            # For local models, use conversation chain
            response = chain_req.run(input=query)
        
        return response
        
    except Exception as e:
        print(f"Verilog generation error: {e}")
        return "Error generating Verilog code. Please try again."

# -------------------------------
# Interactive Mode
# -------------------------------
def verilog_interactive():
    """Run interactive Verilog conversation session"""
    print("Verilog Interactive Mode (type 'exit' to quit)")
    print(f"Using {config.VERILOG_PROVIDER} provider for Verilog generation")
    
    if config.VERILOG_PROVIDER == "local":
        memory = ConversationBufferMemory(memory_key="history")
        chain = ConversationChain(
            llm=verilog_llm,
            prompt=VERILOG_PROMPT,
            memory=memory,
            verbose=False
        )
    
    while True:
        try:
            user_input = input("\nUser: ")
            if user_input.lower() in ['exit', 'quit']:
                break
            
            if config.VERILOG_PROVIDER == "api":
                response = verilog_llm.invoke(user_input)
            else:
                response = chain.run(input=user_input)
            
            code = re.search(r'```(?:verilog)?\s*(.*?)\s*```', response, re.DOTALL)
            
            if code:
                print("\nGenerated Verilog Code:")
                print(code.group(1).strip())
            else:
                print(f"\nAssistant: {response}")
                
        except KeyboardInterrupt:
            break
        except Exception as e:
            print(f"Error: {str(e)}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "interactive":
        verilog_interactive()
    else:
        uvicorn.run("Ollama_gateway:app", host="0.0.0.0", port=8001, reload=True)
