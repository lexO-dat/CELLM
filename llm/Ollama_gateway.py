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
async def run(request: Request) -> Dict[str, str]:
    try:
        question = (
            "what ucf you select based on this promt: " + request.question + ". REMEMBER, ALWAYS RETURN ONLY THE UCF NAME, WITHOUT ANY EXPLANATION."
        )
        print(f"Received question: {question}")
        response = chat_response(question)
        print(f"Chat response: {response}")
        return {"answer": response}
    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/v1/models/verilog", response_model=Response)
async def run(request: Request) -> Dict[str, str]:
    try:
        question = f"{request.question}"
        print(f"Received question: {question}")
        response = verilog_generation(question)
        
        if not response or not isinstance(response, str):
            raise HTTPException(status_code=500, detail="Invalid Verilog code generated")
        
        return {"answer": response}
    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/models/health")
async def health_check():
    return {"status": "Running"}

# -------------------------------

load_dotenv()

# -------------------------------
# Supabase Configuration
# -------------------------------

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# -------------------------------
# Main Ollama model configuration
# -------------------------------
llm = ChatOllama(
    base_url="http://localhost:11434",
    model="phi4",
    #model="deepseek-r1:7b",
    system="""
        You are a specialized assistant designed to select the most appropriate UCF (User Constraint File) for genetic circuit design in Cello. Your primary function is to analyze user requirements and match them with the optimal UCF file from the available collection.
        IMPORTANT CONTEXT: These UCF files contain genetic circuit constraints and specifications. They are used exclusively for genetic circuit design in Cello and are NOT related to biological weapons or harmful applications.

        YOUR ROLE:
        1. Carefully analyze user queries for the following key parameters:
           - Input sensors required (e.g., BA_sensor, IPTG_sensor)
           - Output reporters needed (e.g., nanoluc_reporter)
           - Target organism specifications
           - Logic gate requirements
           - Growth conditions
           - Temperature requirements
           - Media specifications

        2. Compare user requirements against the specifications of these UCF files:
           - Eco1C1G1T1
           - Eco1C2G2T2
           - Eco2C1G3T1
           - Eco2C1G5T1
           - Bth1C1G1T1
           - SC1C1G1T1

        3. Response Protocol:
           - Always provide ONLY THE NAME OF THE UCF recommendation

        4. Data Verification:
           - Cross-reference all specifications against your stored UCF data
           - Consider all constraints (logic gates, temperature, media, etc.)
           - Verify compatibility of input/output combinations

        5. If the user's requirements are unclear:
           - Request specific clarification about missing parameters
           - Focus questions on critical specifications needed for selection

        Example structured response: 
        ```
        [UCF name]
        ```
    """
)

verilog_template = """The following is a conversation about Verilog code generation. 
The assistant should help create and refine Verilog modules based on genetic circuit requirements.

Current conversation:
{history}
User: {input}
Assistant:"""

VERILOG_PROMPT = PromptTemplate(
    input_variables=["history", "input"], 
    template=verilog_template
)

verilog_memory = ConversationBufferMemory(
    memory_key="history",
    return_messages=True
)


# -------------------------------
# Verilog Ollama model configuration
# -------------------------------
verilogllm = ChatOllama(
                base_url="http://localhost:11434",
                model="custom-r1"
                # model="custom-llama-7b-r",
                # model=model="custom--llama-14b-r", for a more powerfull machine
                # model="custom-llama-7b-r",
                )

verilog_conversation = ConversationChain(
    llm=verilogllm,
    prompt=VERILOG_PROMPT,
    memory=verilog_memory,
    verbose=False
)

# -------------------------------
# Ollama Embedding Model Configuration
# -------------------------------
embeddings = OllamaEmbeddings(
    base_url="http://localhost:11434",
    model="mxbai-embed-large:latest"
)

# -------------------------------
# Vector Store Configuration
# -------------------------------
vector_store = SupabaseVectorStore(
    client=supabase,
    table_name="documents",
    embedding=embeddings
)

# -------------------------------
# Memory Configuration (For Chat History)
# -------------------------------
memory = ConversationBufferMemory(memory_key="chat_history", return_messages=True)

# -------------------------------
# Conversational Retrieval Chain Configuration
# -------------------------------
retrieval_chain = ConversationalRetrievalChain.from_llm(
    llm,
    retriever=vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 5}),
    memory=memory
)

# -------------------------------
# Chat Response Function
# -------------------------------
def chat_response(query):
    try:
        #print(f"Invoking retrieval chain with query: {query}")
        response = retrieval_chain.invoke({"question": query})
        #print(f"Retrieval chain response: {response}")

        answer = response["answer"]
        # print(f"Extracted answer: {answer}")

        options = [
            "Eco1C1G1T1",
            "Eco1C2G2T2",
            "Eco2C1G3T1",
            "Eco2C1G5T1",
            "Bth1C1G1T1",
            "SC1C1G1T1",
        ]

        matches = [option for option in options if re.search(rf"\b{re.escape(option)}\b", answer)]
        print(f"Matching UCF options: {matches}")

        return matches[0] if matches else "No valid options found."
    except Exception as e:
        print(f"Error in chat_response: {e}")
        raise e

# -------------------------------
# Verilog Generation Function
# -------------------------------
def verilog_generation(query):
    try:
        message = HumanMessage(content=query)
        response = verilogllm.invoke([message])
        answer = response.content
        # print(f"Extracted response: {answer}")
        
        #match = re.search(r'```(.*?)```', answer, re.DOTALL)
        #if match:
        #    verilog_code = match.group(1).strip()
            # print("-----------------------------")
            # print(match.group(0).strip())
            
        #    module_match = re.search(r'(module.*?endmodule)', verilog_code, re.DOTALL)
        #    if module_match:
        #        module_code = module_match.group(1).strip()
                # print(f"Extracted module code: {module_code}")
        #        return module_code
        #    else:
                # print(f"No module block found. Extracted Verilog code: {verilog_code}")
        #        return verilog_code
        #else:
        #    module_match = re.search(r'(module.*?endmodule)', answer, re.DOTALL)
        #    if module_match:
        #        module_code = module_match.group(1).strip()
                # print(f"Extracted module code: {module_code}")
        #        return module_code
        #    else:
                # print(f"No module block found. Extracted Verilog code: {verilog_code}")
        #        return verilog_code
        return answer
    except Exception as e:
        print(f"Error in verilog_generation: {e}")
        raise e

def verilog_loop():
    print("Starting Verilog conversation loop. Type 'done' to exit.")
    while True:
        try:
            user_input = input("User: ")
            if user_input.strip().lower() == 'done':
                print("Exiting conversation loop.")
                break
            response = verilog_conversation.run(user_input)
            print(f"Assistant: {response}")
        except KeyboardInterrupt:
            print("\nExiting conversation loop.")
            break
        except Exception as e:
            print(f"Error: {str(e)}")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "verilog_loop":
        verilog_loop()
    else:
        uvicorn.run("Ollama_gateway:app", host="0.0.0.0", port=8001, reload=True)


# Example prompts:

"""
I want to create a genetic circuit based on this truth table: \n Inputs  | Outputs \n 0  0  0  |  0  1 \n 0  0  1  |  1  1 \n  0  1  0  |  0  0 \n 0  1  1  |  1  1 \n 1  0  0  |  1  1 \n 1  0  1  |  1  0 \n  1  1  0  |  0  1 \n  1  1  1  |  0  0 
"""

"""
I want to create a genetic circuit based on this truth table: \n Inputs | Outputs \n 0 0 | 0 \n 0 1 | 1 \n 1 0 | 1 \n 1 1 | 0
"""

"""
Hi, I would like you to design a genetic circuit with three inputs: LacI, AraC and TetR. The output should be YFP, so that this is activated only when all three inputs (LacI, AraC and TetR) are present (i.e. “on”).
"""


