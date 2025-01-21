from langchain.memory import ConversationBufferMemory
from langchain.prompts import PromptTemplate
from langchain.schema.runnable import RunnableSequence, RunnableLambda
from langchain_ollama import ChatOllama

# 1) Initialize conversation memory
memory = ConversationBufferMemory(memory_key="history", return_messages=True)

# 2) Define the system message with doubled braces for the JSON, since we'll use Jinja2
system_message = """
You are a genetic circuit assistant. Your job:
1. Read the user's request for a genetic circuit.
2. Identify if the user mentions an organism, input sensors, output reporters, growth conditions, temperature, media, or circuit logic.
3. Fill the following JSON structure with the extracted information:

{{
    "organism_detected": "",
    "input_sensors": "",
    "output_reporters": "",
    "growth_conditions": "",
    "temperature": "",
    "media": "",
    "logic_of_the_circuit": ""
}}

If the user doesn't mention a particular field, leave it as an empty string.

Below is an **example** of how you should respond:

=== EXAMPLE START ===
User: "I want a circuit with TetR and LacI, connected by an AND gate, producing YFP in E. coli NEB 10."

Assistant:
{{
  "json": {{
    "organism_detected": "E. coli NEB 10",
    "input_sensors": "TetR, LacI",
    "output_reporters": "YFP",
    "growth_conditions": "",
    "temperature": "",
    "media": "",
    "logic_of_the_circuit": "AND"
  }},
  "next_action": ""
}}
=== EXAMPLE END ===

Use this exact JSON format. If additional data is missing, you can place a single clarifying question in "next_action". Otherwise, keep "next_action" empty.

ONLY RETURN VALID JSON. Do not add extra commentary. The model only has to ask for more info and if the user does not have more details, just say "now all the data is going to be processed to create the circuit".
"""

# 3) Create a Jinja2-based prompt template
prompt = PromptTemplate(
    input_variables=["history", "user_input"],
    template=(
        system_message
        + "\n\n{{ history }}\n\nHuman: {{ user_input }}\n\nAssistant:"
    ),
    template_format="jinja2"
)

# Helper to format the memory into a readable string
def get_formatted_history():
    """Convert memory messages to a single string for the LLM to see."""
    messages = memory.chat_memory.messages
    return "\n".join(
        f"{msg.type.capitalize()}: {msg.content}" for msg in messages
    )

# 4) Define the Ollama LLM. Adjust 'base_url' and 'model' as needed.
llm = ChatOllama(
    format="json",
    base_url="http://localhost:11434",
    model="llama2-7b-chat.ggmlv3.q4_0.bin",  # Example name; change to your model
    temperature=0.2,  # Lower temp tends to improve compliance
)

# 5) Build the pipeline (RunnableChain)
runnable_chain = (
    RunnableLambda(
        lambda inputs: {
            "history": get_formatted_history(),
            "user_input": inputs["user_input"]
        }
    )
    | prompt
    | llm
)

# 6) CLI loop
print("Welcome to the Genetic Circuit Assistant! Type 'exit' to quit.\n")

while True:
    user_input = input("You: ")
    if user_input.lower() == "exit":
        print("Exiting the assistant. Goodbye!")
        break

    # (A) Store user's message in memory BEFORE building the prompt
    memory.chat_memory.add_user_message(user_input)

    # (B) Prepare input for the pipeline
    pipeline_input = {"user_input": user_input}

    # Optional debug: see the final prompt
    # debug_prompt = prompt.format(**{
    #     "history": get_formatted_history(),
    #     "user_input": user_input
    # })
    # print("\nDEBUG PROMPT:\n", debug_prompt, "\n")

    # (C) Call the pipeline
    try:
        response = runnable_chain.invoke(pipeline_input)
        # (D) Add assistant's response to memory
        memory.chat_memory.add_ai_message(response.content)
        # (E) Print the assistant's output
        print(f"Assistant: {response.content}")
    except Exception as exc:
        print(f"Error: {exc}")


