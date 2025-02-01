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

# -------------------------------
# Configuration
# -------------------------------
load_dotenv()

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------------------
# UCF Model Configuration
# -------------------------------
ucf_llm = ChatOllama(
    base_url="http://localhost:11434",
    model="phi4",
    system="""
    You are a specialized assistant designed to select the most appropriate UCF (User Constraint File) 
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
    - If uncertain, ask for clarification but default to Eco1C1G1T1
    """
)

# -------------------------------
# Verilog Model Configuration
# -------------------------------
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

verilog_llm = ChatOllama(
    base_url="http://localhost:11434",
    model="verilog-r1-32b",
    temperature=0.3,
    system="You are a expert in genetic circuit design using Verilog. Always provide complete, syntactically correct code."
)

# -------------------------------
# Vector Store Configuration
# -------------------------------
embeddings = OllamaEmbeddings(
    base_url="http://localhost:11434",
    model="mxbai-embed-large:latest"
)

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
        # Create fresh memory and chain for each request
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

memory_req = ConversationBufferMemory(memory_key="history")
chain_req = ConversationChain(
        llm=verilog_llm,
        prompt=VERILOG_PROMPT,
        memory=memory_req,
        verbose=False
    )

def verilog_generation(query: str) -> str:
    """Handle Verilog generation with isolated conversation context"""
    try:
        response = chain_req.run(input=query)
        
        # Extract code block using improved regex pattern
        # code_match = re.search(r'```(?:verilog)?\s*(.*?)\s*```', response, re.DOTALL)
        # if code_match:
        #     clean_code = re.sub(r'^\s*\n', '', code_match.group(1).strip())
        #     return clean_code
        
        # Fallback to module detection
        # module_match = re.search(r'(module\s+.*?endmodule)', response, re.DOTALL)
        # if module_match:
        #     return module_match.group(1).strip()
            
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
