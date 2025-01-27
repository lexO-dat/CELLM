from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_community.vectorstores import SupabaseVectorStore
from langchain.memory import ConversationBufferMemory
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

@app.post("/v1/rag/ucf/run", response_model=Response)
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

@app.post("/v1/verilog/run", response_model=Response)
async def run(request: Request) -> Dict[str, str]:
    try:
        question = f"create a verilog file based on this prompt: {request.question}REMEMBER, DONT USE ARRAYS LIKE [X:Y] OR TERNARY OPERATIONS LIKE ? OR :, AND ALWAYS TEST YOUR VERILOG CODE ANALYZING THE TRUTH TABLE COMPARING IT TO THE REQUESTED CIRCUIT."
        print(f"Received question: {question}")
        response = verilog_generation(question)
        
        if not response or not isinstance(response, str):
            raise HTTPException(status_code=500, detail="Invalid Verilog code generated")
        
        return {"answer": response}
    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/v1/rag/health")
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
    # model="phi4", for a more powerfull machine
    model="deepseek-r1:7b",
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

# -------------------------------
# Verilog Ollama model configuration
# -------------------------------
verilogllm = ChatOllama(
                base_url="http://localhost:11434",
                # model=model="custom--llama-14b-r", for a more powerfull machine
                model="custom-llama-7b-r",
                system="""
                    You are an AI assistant that generates CELLO-compatible Verilog code for educational, combinational logic circuits.

                    Behavioral Guidelines:

                        Output Format:
                            Always return only one module top(...) endmodule block.
                            Declare each input and output as individual input wire or output wire (no [x:y] bus notation).
                            Use only assign statements and/or always @(*) blocks with case when necessary.
                            Do not generate or reference any additional modules; no external or sub-modules.
                            Do not include any comments, explanations, or analysis (text outside the Verilog code).

                        Accepted Operators and Constructs:
                            Logic operators: &, |, ~, ^
                            Do not use &&, ||, ternary operators (?:), or clock signals.
                            Use case blocks if a truth table is provided. Otherwise, use simple assign statements for standard logic expressions.

                        Instruction Handling:
                            If the user provides a truth table, parse it and generate the corresponding combinational Verilog using a case statement.
                            If the user describes a logic function (e.g., AND, OR, XOR, etc.), analyze the request and generate assign statements that implement the described logic.
                            Output only the Verilog code necessary to implement the user’s request.

                        Disclaimer:
                            The generated code is for educational purposes only—accuracy and consistency are important, but this is not a biological application.

                    Response Protocol:

                        Always provide ONLY the Verilog code in the response.
                        Do not add commentary, explanations, or any text outside the module block.

                    Example Format:
                    ```
                    module top(
                      input wire A,
                      input wire B, 
                      output wire Y
                    );
                      assign Y = A & B;
                    endmodule
                    ```
                    or
                    ```
                    module based_on_table(output out, input in1, in2, in3);
                        always @(in1, in2, in3)
                            begin
                                case({in1, in2, in3})
                                    3'b000: {out} = 1'b1;
                                    3'b001: {out} = 1'b0;
                                    3'b010: {out} = 1'b1;
                                    3'b011: {out} = 1'b0;
                                    3'b100: {out} = 1'b0;
                                    3'b101: {out} = 1'b1;
                                    3'b110: {out} = 1'b1;
                                    3'b111: {out} = 1'b0;
                                endcase
                            end
                    endmodule
                    ```
                    Note: Always test your Verilog code by analyzing the truth table and comparing it to the requested circuit.
                """                
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
        print(f"Extracted response: {answer}")
        
        match = re.search(r'```(.*?)```', answer, re.DOTALL)
        if match:
            verilog_code = match.group(1).strip()
            # print("-----------------------------")
            # print(match.group(0).strip())
            
            module_match = re.search(r'(module.*?endmodule)', verilog_code, re.DOTALL)
            if module_match:
                module_code = module_match.group(1).strip()
                # print(f"Extracted module code: {module_code}")
                return module_code
            else:
                # print(f"No module block found. Extracted Verilog code: {verilog_code}")
                return verilog_code
        else:
            module_match = re.search(r'(module.*?endmodule)', answer, re.DOTALL)
            if module_match:
                module_code = module_match.group(1).strip()
                # print(f"Extracted module code: {module_code}")
                return module_code
            else:
                # print(f"No module block found. Extracted Verilog code: {verilog_code}")
                return verilog_code

    except Exception as e:
        print(f"Error in verilog_generation: {e}")
        raise e




if __name__ == "__main__":
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

"""

"""