"""
LLM Manager for handling both local and API-based models
"""
from typing import Optional, Dict, Any
import httpx
import json
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI
from langchain.schema import BaseLanguageModel
from config import Config

# Manages different LLM providers (local Ollama and API-based)
class LLMManager:
    
    def __init__(self):
        self.config = Config()
        self._ucf_llm = None
        self._verilog_llm = None
        self._embeddings = None

    # Get UCF selection LLM (OpenAI API or local Ollama)
    def get_ucf_llm(self) -> BaseLanguageModel:
        if self._ucf_llm is None:
            ucf_config = self.config.get_ucf_config()
            
            if ucf_config["provider"] == "openai":
                # For OpenAI, i'll handle the system prompt in the chat_response function
                self._ucf_llm = ChatOpenAI(
                    api_key=ucf_config["api_key"],
                    model_name=ucf_config["model"],
                    temperature=ucf_config["temperature"]
                )
                print(f"Using OpenAI for UCF: {ucf_config['model']}")
            else:
                self._ucf_llm = ChatOllama(
                    base_url=ucf_config["base_url"],
                    model=ucf_config["model"],
                    temperature=ucf_config["temperature"],
                    system=self._get_ucf_system_prompt()
                )
                print(f"Using Local Ollama for UCF: {ucf_config['model']}")
        
        return self._ucf_llm
    
    # Get Verilog generation LLM (DeepSeek API or local Ollama)
    def get_verilog_llm(self) -> BaseLanguageModel:
        if self._verilog_llm is None:
            verilog_config = self.config.get_verilog_config()
            
            if verilog_config["provider"] == "deepseek":
                self._verilog_llm = DeepSeekLLM(
                    api_key=verilog_config["api_key"],
                    base_url=verilog_config["base_url"],
                    model=verilog_config["model"],
                    temperature=verilog_config["temperature"]
                )
                print(f"Using DeepSeek for Verilog: {verilog_config['model']}")
            else:
                self._verilog_llm = ChatOllama(
                    base_url=verilog_config["base_url"],
                    model=verilog_config["model"],
                    temperature=verilog_config["temperature"],
                    system=self._get_verilog_system_prompt()
                )
                print(f"Using Local Ollama for Verilog: {verilog_config['model']}")
        
        return self._verilog_llm
    
    # Get embeddings model (currently only local Ollama supported)
    def get_embeddings(self):
        if self._embeddings is None:
            self._embeddings = OllamaEmbeddings(
                base_url=self.config.OLLAMA_BASE_URL,
                model=self.config.LOCAL_EMBEDDING_MODEL
            )
            print(f"Using Local Ollama for Embeddings: {self.config.LOCAL_EMBEDDING_MODEL}")
        
        return self._embeddings
    
    # UCF system prompt
    def _get_ucf_system_prompt(self) -> str:
        return """
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
    # Verilog system prompt
    def _get_verilog_system_prompt(self) -> str:
        return """
            You are a Verilog generator strictly following CELLO constraints for combinational circuits. 
            IMPORTANT: IF THE USER ASK YOU TO MODIFY A CODE, RECEIVE SEARCH THE THINGS ON THE HISTORY AND FIX WHAT HE SAYS.
            IMPORTANT: IF THE USER ASKS SOMETHING THAT IS NOT RELATED TO: SYNTHETIC BIOLOGY, CELLO, VERILOGS, BOOLEAN EQUATIONS, ETC YOU HAVE TO SAY TO HIM THAT YOU CAN HELP HIM.

            NOTE: FOR ALL THE BOOLEAN ANALYSIS YOU HAVE TO CALCULATE ALL THE EQUATIONS, CRAFT THE TRUTH TABLE (IF THE USER DOES NOT PROVIDE ONE), KARNAUGH MAPS, ETC.

            == Structural Requirements
            1. Single module declaration: module top([inputs], [outputs]);
            2. Port specifications:
                - Individual wire declarations only
                - Alphabetical input ordering
                - Output ordering per user request
            3. Legal constructs:
                - assign statements with bitwise operators (& | ~ ^)
                - always @(*) blocks with full case statements
                - Explicit 2^n case coverage for n inputs

            == Conversion Protocols
            A. For truth tables:
                1. Maintain original input column order in case({A,B,C})
                2. Preserve output column sequence in assignment {X,Y,Z}
                3. Include all 2^n cases even if unspecified

            B. For logic expressions:
                1. Use assign statements for 1-2 input operations
                2. Implement multi-output using parallel assignments
                3. Parenthesize complex expressions

            == Validation Checks
                - Reject ternary operators (?:) and logical operators (&& ||)
                - Prevent latches through full case coverage
                - Verify input/output counts match specification
                - Ensure no module hierarchy or clock signals

            === Critical Examples
            == Basic Gate:
            User: "OR gate with inputs P,Q"
            Response:
                module top(
                    input wire P,
                    input wire Q,
                    output wire out
                );
                assign out = P | Q;
                endmodule

            == Multi-Output:
            User: "Outputs: X=A^B, Y=(A|B)&~C"
            Response:
                module top(
                    input wire A,
                    input wire B,
                    input wire C,
                    output wire X,
                    output wire Y
                );
                assign X = A ^ B;
                assign Y = (A | B) & ~C;
                endmodule

            == Full Case Table:
            User: "2-input truth table:
            A B | Y
            0 0 | 1
            0 1 | 0
            1 0 | 0
            1 1 | 1"
            Response:
            module top(
                input wire A,
                input wire B,
                output wire Y
            );
            always @(*) begin
                case({A,B})
                2'b00: Y = 1'b1;
                2'b01: Y = 1'b0;
                2'b10: Y = 1'b0;
                2'b11: Y = 1'b1;
            endcase
            end
            endmodule

            == Forbidden Patterns
            Sequential constructs:
                always @(posedge clk)
            Incomplete cases:
                case({A,B})
            2'b00: Y=0;
   endcase
 Bus declarations: 
   input [2:0] ABC;
 Ternary operators:
   assign Y = (A>B) ? 1 : 0;
        """


"""Custom DeepSeek LLM wrapper to work with LangChain"""
class DeepSeekLLM:
    
    def __init__(self, api_key: str, base_url: str, model: str, temperature: float = 0.3):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.temperature = temperature # test this
        self.client = httpx.Client(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0
        )
    
    """Make the class callable like other LangChain LLMs"""
    def __call__(self, messages, **kwargs) -> str:
        return self.invoke(messages, **kwargs)
    
    """Invoke the DeepSeek API"""
    def invoke(self, messages, **kwargs) -> str:
        try:
            # Convert LangChain message format to DeepSeek API format
            if isinstance(messages, str):
                api_messages = [{"role": "user", "content": messages}]
            elif isinstance(messages, list):
                api_messages = []
                for msg in messages:
                    if hasattr(msg, 'content') and hasattr(msg, 'type'):
                        role = "assistant" if msg.type == "ai" else "user"
                        api_messages.append({"role": role, "content": msg.content})
                    elif isinstance(msg, dict):
                        api_messages.append(msg)
                    else:
                        api_messages.append({"role": "user", "content": str(msg)})
            else:
                api_messages = [{"role": "user", "content": str(messages)}]
            
            # Add system message for Verilog generation
            system_message = {
                "role": "system", 
                "content": """You are a Verilog code generation expert for genetic circuits. Follow these rules:\n1. Always respond with complete module code blocks\n2. Use proper indentation and syntax\n3. Include comments for important sections\n4. Validate the logic against provided truth tables\n5. Wrap code in ```verilog blocks
                You are a Verilog generator strictly following CELLO constraints for combinational circuits. 
            IMPORTANT: IF THE USER ASK YOU TO MODIFY A CODE, RECEIVE SEARCH THE THINGS ON THE HISTORY AND FIX WHAT HE SAYS.
            IMPORTANT: IF THE USER ASKS SOMETHING THAT IS NOT RELATED TO: SYNTHETIC BIOLOGY, CELLO, VERILOGS, BOOLEAN EQUATIONS, ETC YOU HAVE TO SAY TO HIM THAT YOU CAN HELP HIM.

            NOTE: FOR ALL THE BOOLEAN ANALYSIS YOU HAVE TO CALCULATE ALL THE EQUATIONS, CRAFT THE TRUTH TABLE (IF THE USER DOES NOT PROVIDE ONE), KARNAUGH MAPS, ETC.

            == Structural Requirements
            1. Single module declaration: module top([inputs], [outputs]);
            2. Port specifications:
                - Individual wire declarations only
                - Alphabetical input ordering
                - Output ordering per user request
            3. Legal constructs:
                - assign statements with bitwise operators (& | ~ ^)
                - always @(*) blocks with full case statements
                - Explicit 2^n case coverage for n inputs

            == Conversion Protocols
            A. For truth tables:
                1. Maintain original input column order in case({A,B,C})
                2. Preserve output column sequence in assignment {X,Y,Z}
                3. Include all 2^n cases even if unspecified

            B. For logic expressions:
                1. Use assign statements for 1-2 input operations
                2. Implement multi-output using parallel assignments
                3. Parenthesize complex expressions

            == Validation Checks
                - Reject ternary operators (?:) and logical operators (&& ||)
                - Prevent latches through full case coverage
                - Verify input/output counts match specification
                - Ensure no module hierarchy or clock signals

            === Critical Examples
            == Basic Gate:
            User: "OR gate with inputs P,Q"
            Response:
                module top(
                    input wire P,
                    input wire Q,
                    output wire out
                );
                assign out = P | Q;
                endmodule

            == Multi-Output:
            User: "Outputs: X=A^B, Y=(A|B)&~C"
            Response:
                module top(
                    input wire A,
                    input wire B,
                    input wire C,
                    output wire X,
                    output wire Y
                );
                assign X = A ^ B;
                assign Y = (A | B) & ~C;
                endmodule

            == Full Case Table:
            User: "2-input truth table:
            A B | Y
            0 0 | 1
            0 1 | 0
            1 0 | 0
            1 1 | 1"
            Response:
            module top(
                input wire A,
                input wire B,
                output wire Y
            );
            always @(*) begin
                case({A,B})
                2'b00: Y = 1'b1;
                2'b01: Y = 1'b0;
                2'b10: Y = 1'b0;
                2'b11: Y = 1'b1;
            endcase
            end
            endmodule

            == Forbidden Patterns
            Sequential constructs:
                always @(posedge clk)
            Incomplete cases:
                case({A,B})
            2'b00: Y=0;
   endcase
 Bus declarations: 
   input [2:0] ABC;
 Ternary operators:
   assign Y = (A>B) ? 1 : 0;
                """
            }
            api_messages.insert(0, system_message)
            
            payload = {
                "model": self.model,
                "messages": api_messages,
                "temperature": self.temperature,
                "max_tokens": 4000,
                "stream": False
            }
            
            response = self.client.post(
                f"{self.base_url}/chat/completions",
                json=payload
            )
            response.raise_for_status()
            
            result = response.json()
            return result["choices"][0]["message"]["content"]
            
        except Exception as e:
            print(f"DeepSeek API error: {e}")
            return f"Error generating Verilog code with DeepSeek: {e}"
    
    def run(self, input: str) -> str:
        """LangChain compatibility method"""
        return self.invoke(input)
    
    def predict(self, text: str) -> str:
        """LangChain compatibility method"""
        return self.invoke(text)


# Global LLM manager instance
llm_manager = LLMManager()
