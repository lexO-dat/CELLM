# CELLM
This is the code repository for the CELLM paper, CELLM is an AI-powered tool that bridges synthetic biology and natural language processing. It enables the design and analysis of genetic circuits through simple text descriptions by integrating large language models (LLMs), the CELLO synthetic biology framework, and a modular backend.

Synthetic biology is an interdisciplinary field combining biology, engineering, and computation to create or modify biological systems for specific purposes. This project aims to automate the creation of genetic circuits by leveraging Verilog code generation, LLMs, and retrieval-augmented UCF selection.

# Examples from the paper
## Example 1: 3-input AND gate
In this first example, a 3-input AND gate was described to \emph{CELLM}. The specific description prompt is: **"Hi, I would like you to design a genetic circuit with three inputs: LacI, AraC, and TetR. The output should be YFP, which is activated only when all three inputs (LacI, AraC, and TetR) are present (i.e., ‘on’)."**.

- The full reasoning process: [reasoning process](https://github.com/lexO-dat/CELLM/blob/main/Examples/3-input%20AND%20gate/reasoning.txt)
- The final response of the model: [model response](https://github.com/lexO-dat/CELLM/blob/main/Examples/3-input%20AND%20gate/response.txt)
- Generated Verilog:
``` verilog
module top(
    input wire AraC,  // Alphabetical ordering
    input wire LacI,
    input wire TetR,
    output wire YFP   // Single output
);
    assign YFP = AraC & LacI & TetR;  // AND operation
endmodule
```

## Example 2: The Repressilator
In this second example, the Repressilator logic was described to CELLM. The prompt given to the system was: **"Hi CELLM. Please produce a single circuit in which a LacI protein (regulated by an Ara promoter) represses a Lac promoter. This Lac promoter regulates a TetR protein that in turn represses a Tet promoter. Finally, this Tet promoter regulates the AraC protein that represses the first Ara promoter."**.

- The full reasoning process: [reasoning process](https://github.com/lexO-dat/CELLM/blob/main/Examples/The%20Repressilator/reasoning.txt)
- The final response of the model: [model response](https://github.com/lexO-dat/CELLM/blob/main/Examples/The%20Repressilator/response.txt)
- Generated Verilog:
``` verilog
module top(
    output wire LacI,      // LacI protein level
    output wire TetR,      // TetR protein level
    output wire AraC       // AraC protein level
);
    // Internal promoter activity wires
    wire P_ara_active, P_lac_active, P_tet_active;
    
    // Core regulatory logic
    assign P_ara_active = ~AraC;     // Ara promoter repressed by AraC
    assign LacI = P_ara_active;      // LacI produced by Ara promoter
    assign P_lac_active = ~LacI;     // Lac promoter repressed by LacI
    assign TetR = P_lac_active;      // TetR produced by Lac promoter
    assign P_tet_active = ~TetR;     // Tet promoter repressed by TetR
    assign AraC = P_tet_active;      // AraC produced by Tet promoter

endmodule
```
## Example 3: Table-based input combinatory circuit
For this example the logic table was provided to CELLM with the following prompt: **"I want to create a genetic circuit based on this truth table: \n Inputs  | Outputs | 0  0  0  $->$  0  | 0  0  1  $->$  0 |  0  1  0  $->$  0  | 0  1  1  $->$   1 | 1  0  0  $->$  1  | 1  0  1  $->$  1  |  1  1  0  $->$  0  |  1  1  1  $->$  1"**.

- The full reasoning process: [reasoning process](https://github.com/lexO-dat/CELLM/blob/main/Examples/Table-based%20input/reasoning.txt)
- The final response of the model: [model response](https://github.com/lexO-dat/CELLM/blob/main/Examples/Table-based%20input/response.txt)
- Generated Verilog:
``` verilog
module top(
    input wire A,       // Input 1
    input wire B,       // Input 2
    input wire C,       // Input 3
    output wire Y       // Output
);
    // Truth table implementation using full case statement
    always @(*) begin
        case({A, B, C})
            3'b000: Y = 1'b0;
            3'b001: Y = 1'b0;
            3'b010: Y = 1'b0;
            3'b011: Y = 1'b1;
            3'b100: Y = 1'b1;
            3'b101: Y = 1'b1;
            3'b110: Y = 1'b0;
            3'b111: Y = 1'b1;
            default: Y = 1'b0; // Full coverage guarantee
        endcase
    end
endmodule
```
## Example 4: Verilog-input based multiplexer
For this example, we utilized the **multiplexer** Verilog module provided by Cello in their v2.0 paper. The system was prompted with the following request: **"Help me create the circuit for this Verilog module:"**
``` verilog
module multiplexer_alt(output out, input A, B, C);
    always @(C, B, A)
    begin
        case({C, B, A})
            3'b000: {out} = 1'b0;
            3'b001: {out} = 1'b0;
            3'b010: {out} = 1'b0;
            3'b011: {out} = 1'b1;
            3'b100: {out} = 1'b1;
            3'b101: {out} = 1'b1;
            3'b110: {out} = 1'b0;
            3'b111: {out} = 1'b1;
        endcase
    end
endmodule
```

- The full reasoning process: [reasoning process](https://github.com/lexO-dat/CELLM/blob/main/Examples/Verilog-input%20based%20multiplexer/reasoning.txt)
- The final response of the model: [model response](https://github.com/lexO-dat/CELLM/blob/main/Examples/Verilog-input%20based%20multiplexer/response.txt)
- Generated Verilog:
``` verilog
module top(
    input wire A,       // Input A
    input wire B,       // Input B
    input wire C,       // Input C (selector)
    output wire out     // Output
);
    // Simplified logic implementation
    assign out = (C & ~B) | (B & A);
endmodule
```

# UCF TXT Files

We have different UCF uploaded to Supabase in this repository. these ucf were not uploaded in their entirety as they are very extensive, instead, they were summarized so that the llm can identify important characteristics when selecting a ucf.

## Available Files

Below you'll find direct links to the TXT files to view their content:

### UCF 1:
[reasoning process](https://github.com/lexO-dat/CELLM/blob/main/db_txts/Eco1C1G1T1.txt)

### UCF 2:
[reasoning process](https://github.com/lexO-dat/CELLM/blob/main/db_txts/Eco1C2G2T2.txt)

### UCF 3:
[reasoning process](https://github.com/lexO-dat/CELLM/blob/main/db_txts/Eco1C1G3T1.txt)

### UCF 4:
[reasoning process](https://github.com/lexO-dat/CELLM/blob/main/db_txts/Eco2C1G5T1.txt)

### UCF 5:
[reasoning process](https://github.com/lexO-dat/CELLM/blob/main/db_txts/SC1C1G1T1.txt)

### UCF 6:
[reasoning process](https://github.com/lexO-dat/CELLM/blob/main/db_txts/BthC1G1T1.txt)

---

*Files are stored in Supabase so, is not public the access to the database*

# System requirements:
- If you want to use exactly the same model i used locally:
  -  Minimum: 64Gb RAM, M1 ultra / Intel Core i9-12900K, 100Gb disk
  -  Recommended: 128GB ram, M1 ultra / Intel Core i9-12900K, 100Gb disk

# Prerequisites:
## Ollama
### Run Ollama locally
- To install Ollama, go to the [Ollama web page](https://ollama.com/) and follow the installation instructions in the documentation. (NOTE: if you have a NVIDIA gpu you have to configure the NVIDIA cuda drivers).
- To execute Ollama run:
```
ollama serve
```
- Create the custom verilog creator model based on the "custom-llama" file with the following commands:
```
cd llm/ollama/
ollama pull deepseek-r1:32b
ollama create verilog-r1-32b -f custom-llama
ollama pull phi4
ollama pull mxbai-embed-large:latest
```
NOTE: IT USES THE DEEPSEEK-R1:32B MODEL SO CHECK THE SYSTEM REQUIREMENT POINT.

## CELLO:
- You need Docker installed:
Just run the command:
``` bash
docker run -p 8000:8000 -d lexodat2111/cello-api
```
This will run the cello image on the port 8000 in the background. If you want to see the logs of the container (in case that something failed) just run:
```bash
docker logs < container id >
```

NOTE: this will execute the cello api in 0.0.0.0:8000, to see more further information about the endpoints go to: 0.0.0.0:8000/docs.

## Frontend:
- nodejs and pnpm installed
- To install all the dependencies and run the front run the following commands:
``` bash
cd frontend
npm install
npm run dev
```

NOTE: The frontend is the most updated way to use the system

# Ollama gateway

NOTE: you have to create a supabase account and locate the SUPABASE_URL and SUPABASE_KEY to create the vectorial database and also have to create a .env file:

```
SUPABASE_URL="SUPABASE URL"
SUPABASE_KEY="SUPABASE KEY"
```

## Upload files to supabase vector database
- First, you must obtain all the supabase keys.
- Then, you have to move your txt file into the root folder.
- you have to have running the ollama image.
- Finally, run the next command:

  ``` bash
  python upload.py
  ```

  - The ucf txt file have to be like this:
``` txt
# Bth1C1G1T1 inputs
Input Sensors:
- Bth1C1G1T1 input: BA_sensor
- Bth1C1G1T1 input: IPTG_sensor
- Bth1C1G1T1 input: aTc_sensor

# Bth1C1G1T1 outputs
Output Sensors:
- Bth1C1G1T1 output: nanoluc_reporter
- Bth1C1G1T1 output: nanoluc_reporter_2

# Bth1C1G1T1 organism
Organism:
- Bth1C1G1T1 organism: Bacteroides thetaiotaomicron VPI-5482

# Bth1C1G1T1 genome
Genome:
- Bth1C1G1T1 genome: wildtype with dCas9 integrated

# Bth1C1G1T1 media
Media:
- Bth1C1G1T1 media: TYG (10 g/L Tryptone Peptone, 5 g/L Yeast Extract, 11 mM Glucose, 100 mM KPO4 (pH7.2), 72\u00b5M CaCl2, 0.4 \u00b5g/ml FeSO4 and 1\u00b5g/mL Resazurin, 1.2 \u00b5g/ml hematin, 0.5g/mL of L-cysteine, and 1 \u00b5g/ml of Vitamin K (menadione)

# Bth1C1G1T1 temperature
Temperature:
- Bth1C1G1T1 temperature: 37 degrees Celsius

# Bth1C1G1T1 growth
Growth:
- Bth1C1G1T1 growth: Inoculation: Inoculate individual colonies into TYG media without antibiotics and grow 18 hours overnight in the anaerobic chamber.  Dilution and Induction: Next day, dilute 100-fold into pre-reduced TYG with inducers (no antibiotics), grow for 6 hours in the anaerobic chamber.  Measurement: Plate Reader, data processing for RPUL normalization

# Bth1C1G1T1 posible use
Posible Use:
- Bth1C1G1T1 posible use: It can be used in genetic circuits as a logical switch where dCas9 blocks a promoter until it receives a signal (e.g., chemical induction), enabling combinational control in biological systems.
```

  NOTE: if it's your first time running the app upload all the .txt file inside the App/cello/library/constraints folder, this txt files are all the ucf information for the ucf recognition system, if you want to upload a custom ucf follow the structure of the txt file showed above.


# Configure the mail server:
NOTE: If your machine has graphical interface this is optional, all the files will be saved inside the Downloads folder.
To use this package, you'll need to obtain an application-specific password for the Gmail account you want to send emails from. This password is required for authentication when sending emails.

### Obtaining Application-Specific Password

To obtain an application-specific password for Gmail:

1. Go to your sender gmail Account settings: [https://myaccount.google.com/](https://myaccount.google.com/)
2. Click on "Security" in the left sidebar.
3. You have to activate the two way factor
4. Go to the two way factor menu and search the application passwords
5. Then you have to create an application and copy the code, that is your password

# Running the apps
There are 2 options:
- web chat
- cli app

for the frontend you have to run:
- the cello image running
- the ollama gateway
- the frontend app

for the cli:
- the cello image running
- the ollama gateway image running
- the cli script

## Running the cli script
Pre-requisites:
- **golang** installed on your machine
To run the cli you have to run:
```bash
go mod init
go mod tidy
go run cmd/main.go
```

All the information about how to run this modules is on the prerequisites section.

If you have questions, suggestions, or just want to connect:

[![GitHub](https://img.shields.io/badge/GitHub-Profile-181717?style=for-the-badge&logo=github)](https://github.com/lexO-dat)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-Profile-0A66C2?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/lucasabello/)
[![Email](https://img.shields.io/badge/Email-Me%20Here-D14836?style=for-the-badge&logo=gmail)](mailto:lucas.abello@mail.udp.cl)
