from langchain_ollama import ChatOllama
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.chat_history import BaseChatMessageHistory
from langchain_core.runnables.history import RunnableWithMessageHistory
from langchain.memory import ChatMessageHistory
import requests
import time

# Configuration
MODEL_NAME = "deepseek-r1:7b"
OLLAMA_BASE_URL = "http://localhost:11434"
SESSION_ID = "genetic-circuit-session-001"

# Initialize model with timeout
llm = ChatOllama(
    model=MODEL_NAME,
    temperature=0.3,
    base_url=OLLAMA_BASE_URL,
    timeout=300
)

# Session store
store = {}

def get_session_history(session_id: str) -> BaseChatMessageHistory:
    if session_id not in store:
        store[session_id] = ChatMessageHistory()
    return store[session_id]

# System prompt for interactive refinement
prompt = ChatPromptTemplate.from_messages([
    ("system", """You are a Genetic Circuit Design Manager. Your workflow:
1. Receive initial circuit description
2. Analyze components and parameters
3. Suggest improvements/clarifications through questions
4. Finalize specifications for UCF and Verilog generation

Ask one question at a time and wait for user confirmation.""",
    ),
    ("placeholder", "{history}"),
    ("human", "{input}")
])

# Build conversation chain
chain = prompt | llm
conversation = RunnableWithMessageHistory(
    chain,
    get_session_history,
    input_messages_key="input",
    history_messages_key="history",
)

def refine_prompt(initial_prompt: str) -> str:
    print("\nInitializing Circuit Refinement...")
    
    # Start with initial prompt
    response = conversation.invoke(
        {"input": f"User's initial design:\n{initial_prompt}\n\nFirst, confirm your understanding then suggest improvements."},
        config={"configurable": {"session_id": SESSION_ID}}
    )
    
    print("\nAssistant:", response.content)
    
    # Interactive refinement loop
    while True:
        user_input = input("\nYour response (type 'done' to finish): ")
        if user_input.lower() == 'done':
            break
            
        response = conversation.invoke(
            {"input": user_input},
            config={"configurable": {"session_id": SESSION_ID}}
        )
        print("\nAssistant:", response.content)
    
    # Generate final version
    final_response = conversation.invoke(
        {"input": "Please provide the finalized specification in markdown format."},
        config={"configurable": {"session_id": SESSION_ID}}
    )
    
    return final_response.content

def query_agent(api_url: str, prompt: str) -> str:
    try:
        response = requests.post(
            api_url,
            json={"prompt": prompt},
            timeout=60
        )
        return response.json().get('result', 'Error processing request')
    except Exception as e:
        return f"API Error: {str(e)}"

def main():
    # User's initial circuit description
    initial_prompt = (
        "I want to create a genetic circuit for the E.coli NEB 10 organism. "
        "The circuit consists of 2 logic gates: "
        "1. AND gate with TetR and LacI inputs, outputting YFP reporter. "
        "2. XOR gate using the AND gate output and AraC sensor, outputting YFP. "
        "Operates at 37°C."
    )
    
    print("Initial Circuit Description:")
    print(initial_prompt)
    
    # Interactive refinement
    final_prompt = refine_prompt(initial_prompt)
    
    print("\n=== Finalized Design ===")
    print(final_prompt)
    
    # Query agents
    print("\nGenerating Components...")
    ucf_response = query_agent("http://localhost:8001/v1/rag/ucf/run", final_prompt)
    verilog_response = query_agent("http://localhost:8001/v1/rag/verilog/run", final_prompt)
    
    print("\n=== UCF Parts Selection ===")
    print(ucf_response)
    
    print("\n=== Verilog Circuit Logic ===")
    print(verilog_response)

if __name__ == "__main__":
    main()