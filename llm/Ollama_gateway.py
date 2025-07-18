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
from typing import Dict, Optional, List
import re
import time
import random

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

# Conversation Memory Storage
conversation_memories = {}

def extract_user_requirements(conversation_history: str, current_message: str) -> str:
    """
    Extract user requirements from conversation for UCF selection.
    Returns a summary of complexity, organism, sensors, outputs, etc.
    """
    try:
        # Combine conversation history and current message
        full_context = f"{conversation_history}\nCurrent request: {current_message}"
        
        # Create extraction prompt
        extraction_prompt = f"""
Analyze the following user conversation about genetic circuit design and extract key requirements for UCF (User Constraint File) selection.

Extract ONLY the information explicitly mentioned by the user:

**Circuit Requirements:**
{full_context}

**Extract and summarize:**
1. **Circuit Complexity**: Simple (1-2 gates), Medium (3-4 gates), Complex (5+ gates)
2. **Target Organism**: E. coli, B. subtilis, S. cerevisiae, or any specific organism mentioned
3. **Input Sensors**: Any specific sensors mentioned (IPTG, aTc, arabinose, etc.)
4. **Output Reporters**: Any reporters mentioned (GFP, RFP, luciferase, etc.)
5. **Logic Type**: AND, OR, NOT, NAND, NOR, XOR, or complex combinations
6. **Special Requirements**: Temperature, media, growth conditions, etc.

**Format your response as a concise summary:**
"Circuit: [logic type] gate(s), Complexity: [simple/medium/complex], Organism: [if mentioned], Inputs: [if mentioned], Outputs: [if mentioned], Special: [any special requirements]"

If information is not mentioned, omit that field. Keep the summary concise and focused on UCF selection criteria.
"""

        # Use the same LLM as Verilog generation for consistency
        if config.VERILOG_PROVIDER == "api":
            summary = verilog_llm.invoke(extraction_prompt)
        else:
            # For local models, use a simple extraction
            summary = f"Circuit requirements from user: {current_message}"
        
        return summary if isinstance(summary, str) else str(summary)
        
    except Exception as e:
        print(f"Requirements extraction error: {e}")
        return f"User requested: {current_message}"

class ConversationRequest(BaseModel):
    question: str
    session_id: str = None
    conversation_stage: str = "design"  # design, refinement, approval, processing

class ConversationResponse(BaseModel):
    response: str
    thinking: Optional[str] = ""
    conversation_stage: str
    session_id: str
    needs_approval: bool = False
    generated_verilog: Optional[str] = ""
    recommendations: List[str] = []
    user_requirements_summary: Optional[str] = ""  # Add requirements summary for UCF selection

@app.post("/v1/models/conversation", response_model=ConversationResponse)
async def conversation_endpoint(request: ConversationRequest) -> Dict[str, str]:
    """
    New conversational endpoint that maintains chat memory and guides users through
    the entire design process with recommendations and refinements.
    """
    try:
        session_id = request.session_id or f"session_{int(time.time())}_{random.randint(1000, 9999)}"
        
        # Initialize or get existing memory for this session
        if session_id not in conversation_memories:
            conversation_memories[session_id] = ConversationBufferMemory(
                memory_key="chat_history",
                return_messages=True
            )
        
        memory = conversation_memories[session_id]
        
        # Enhanced system prompt for direct Verilog generation
        system_prompt = """You are CELLM, an expert Verilog code generation assistant for genetic circuits. Your primary role is to IMMEDIATELY generate Verilog code based on user requests.

## YOUR APPROACH:

1. **IMMEDIATE CODE GENERATION**: When a user describes a circuit or logic they want, generate the Verilog code right away. Don't ask for additional details unless absolutely necessary.

2. **EXPLAIN YOUR DECISIONS**: After generating code, explain:
   - Why you chose specific logic implementations
   - How the circuit works
   - Any assumptions you made
   - Potential optimizations or alternatives

3. **ITERATIVE REFINEMENT**: If the user wants changes:
   - Modify the code based on their feedback
   - Explain what you changed and why
   - Keep refining until they approve

4. **CODE STRUCTURE**: Always generate complete, functional Verilog modules with:
   - Proper module declarations
   - Clear input/output definitions
   - Well-commented logic
   - Proper syntax and formatting

## VERILOG BEST PRACTICES:

- Use descriptive signal names
- Include comments explaining complex logic
- Follow standard Verilog coding conventions
- Generate synthesizable code
- Consider timing and logic optimization

## EXAMPLE WORKFLOW:

User: "Create an AND gate with two inputs"
You: Generate Verilog code immediately, then explain the implementation

User: "Make it a 3-input AND gate instead"
You: Modify the code and explain the changes

User: "Perfect, I approve this design"
You: Confirm approval and indicate readiness for UCF selection

## CONVERSATION STAGES:

- **design**: Generate initial Verilog code
- **refinement**: Modify code based on user feedback  
- **approval**: User approves the final design
- **processing**: Move to UCF selection and Cello processing

## KEY PRINCIPLE:
Be direct and action-oriented. Generate code first, ask questions later only if truly needed.

Current conversation stage: {stage}
"""

        # Get conversation history
        chat_history = memory.chat_memory.messages if hasattr(memory, 'chat_memory') else []
        
        # Format conversation history for the prompt
        history_text = ""
        for msg in chat_history:
            role = "User" if hasattr(msg, 'type') and msg.type == "human" else "Assistant"
            content = msg.content if hasattr(msg, 'content') else str(msg)
            history_text += f"{role}: {content}\n"
        
        # Add context about conversation stage
        context_prompt = f"""
{system_prompt.format(stage=request.conversation_stage)}

Previous conversation:
{history_text}

User message: {request.question}

Please respond naturally and guide the conversation appropriately. If this is the first message, introduce yourself and ask about their design requirements.
"""

        # Check if we're using API or local model and handle accordingly
        if config.VERILOG_PROVIDER == "api":
            # For API models (DeepSeek), use direct invocation
            response = verilog_llm.invoke(context_prompt)
        else:
            # For local models, use conversation chain
            conversation_chain = ConversationChain(
                llm=verilog_llm,
                memory=memory,
                verbose=True
            )
            response = conversation_chain.predict(input=context_prompt)
        
        # Save the conversation in memory manually for API models
        if config.VERILOG_PROVIDER == "api":
            from langchain.schema import HumanMessage, AIMessage
            memory.chat_memory.add_message(HumanMessage(content=request.question))
            memory.chat_memory.add_message(AIMessage(content=response))
        
        # Parse thinking and response
        thinking_part = ""
        response_part = response
        if '</think>' in response:
            parts = response.split('</think>', 1)
            thinking_part = parts[0].replace('<think>', '').strip()
            response_part = parts[1].strip()
        
        # Determine next conversation stage and extract information
        needs_approval = False
        generated_verilog = None
        recommendations = []
        next_stage = request.conversation_stage
        user_requirements_summary = ""
        
        # Check if Verilog code was generated
        verilog_match = re.search(r'```(?:verilog)?\s*(module.*?endmodule)\s*```', response_part, re.DOTALL | re.IGNORECASE)
        if verilog_match:
            generated_verilog = verilog_match.group(1).strip()
            needs_approval = True
            next_stage = "approval"
            
            # Extract user requirements for UCF selection when Verilog is generated
            user_requirements_summary = extract_user_requirements(history_text, request.question)
            print(f"Extracted user requirements for UCF: {user_requirements_summary}")
        
        # Extract recommendations with improved parsing
        recommendations = []
        if "recommend" in response_part.lower() or "suggest" in response_part.lower():
            # Extract bullet points, numbered lists, and recommendation phrases
            bullet_matches = re.findall(r'[•\-\*]\s*(.+?)(?=\n[•\-\*]|\n[^•\-\*]|\n\n|$)', response_part, re.MULTILINE)
            number_matches = re.findall(r'\d+\.\s*(.+?)(?=\n\d+\.|\n[^\d]|\n\n|$)', response_part, re.MULTILINE)
            
            # Extract recommendation phrases
            rec_phrases = re.findall(r'(?:I recommend|I suggest|Consider|Try|You should|You could|It would be better to)\s+(.+?)(?=\.|!|\?|\n|$)', response_part, re.IGNORECASE)
            
            all_recommendations = bullet_matches + number_matches + rec_phrases
            recommendations = [rec.strip() for rec in all_recommendations if rec.strip() and len(rec.strip()) > 10]
            
            # Limit to most relevant recommendations
            recommendations = recommendations[:5]
        
        return {
            "response": response_part,
            "thinking": thinking_part or "",
            "conversation_stage": next_stage,
            "session_id": session_id,
            "needs_approval": needs_approval,
            "generated_verilog": generated_verilog or "",
            "recommendations": recommendations,
            "user_requirements_summary": user_requirements_summary
        }
        
    except Exception as e:
        print(f"Conversation endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Clean up old conversation memories (optional)
@app.delete("/v1/models/conversation/{session_id}")
async def clear_conversation(session_id: str):
    """Clear conversation memory for a session"""
    if session_id in conversation_memories:
        del conversation_memories[session_id]
        return {"message": "Conversation cleared"}
    return {"message": "Session not found"}

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "interactive":
        verilog_interactive()
    else:
        uvicorn.run("Ollama_gateway:app", host="0.0.0.0", port=8088, reload=True)
