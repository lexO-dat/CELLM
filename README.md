
# CELLM
Synthetic biology is an interdisciplinary field that combines biology, engineering and computation to design and build new biological systems or modify existing ones for specific purposes. Within this context, the creation and optimization of genetic circuits are key tasks to advance in the creation of efficient and functional systems.

This project is focused on developing an automated system to analyze and create genetic circuits using tools such as CELLO and artificial intelligence.

# Folder structure:
CELLM/ \n
├─ App/ \n
│  ├─ cello/ -> all the cello files \n
├─ llm/ \n
│  ├─ ollama/ \n
│  │  ├─ custom-llama -> the custom-llama configuration \n
│  ├─ mailserver/ \n
│  │  ├─ main.go -> mailserver main script \n 
│  ├─ upload.py -> script to upload files \n
│  ├─ Ollama_gateway.py -> gateway \n
├─ frontend/ -> react frontend folder \n
├─ requirements.txt \n
├─ cli.py -> cli script \n

# System requirements:
- If you want to use exactly the same model i used:
  -  Minimum: 64Gb RAM, M1 ultra / Intel Core i9-12900K, 100Gb disk
  -  Recommended: 128GB ram, M1 ultra / Intel Core i9-12900K, 100Gb disk

- If you want to run a low parameter model:
  -  Minimum: 16Gb RAM, Intel core i5-11400h / M1, 40Gb disk
  -  Recommended: 32Gb RAM, Intel core i5-11400h / M1, 40Gb disk

NOTE: if you want to use other model you have to change:
- The custom-llama file import model.
- The Ollama_gateway called models

For that:
Fist go to the llm/ollama folder and change the FROM import to the new model, for example: FROM deepseek-r1:7b
Then go back to the llm/ folder and change the base_url of the model you change ( i recommend a reasonning model for the verilog and a simple model for the ucf)

# Prerequisites:
## Ollama:
- To install Ollama, go to the [Ollama web page](https://ollama.com/) and follow the installation instructions in the documentation. (NOTE: if you have a NVIDIA gpu you have to configure the NVIDIA cuda drivers).
- To execute Ollama run:
```
ollama serve
```
- Create the custom verilog creator model based on the "custom-llama" file with the following commands:
```
cd llm/ollama/
ollama pull deepseek-r1:32b
ollama create custom-r1 -f custom-llama
ollama pull phi4
ollama pull mxbai-embed-large:latest
```
NOTE: IT USES THE DEEPSEEK-R1:32B MODEL SO CHECK THE SYSTEM REQUIREMENT POINT.

## CELLO:
- Python 3.11 version (if you want to run it locally).
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
cd front/chat
pnpm install
pnpm run dev
```

NOTE: the frontend is not updated, to use all the system functionalities use the cli.

# Ollama gateway

NOTE: you have to create a supabase account and locate the SUPABASE_URL and SUPABASE_KEY to create the vectorial database and also have to create a .env file:

```
SUPABASE_URL="SUPABASE URL"
SUPABASE_KEY="SUPABASE KEY"
```

## Upload files to supabase vector database
- First, you must obtain all the supabase keys listed in the RAG System section.
- Then, you have to move your txt file to the llm folder.
- In the upload code change the txt name on the "loader" variable.
- you have to start ollama with the "ollama serve" command.
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

## Running the gateway:
First you need to have the ollama models created and pulled, then you can start the gateway with the next commands:
```bash
pip install -r requirements.txt && cd llm
```
```bash
python Ollama_gateway
```

NOTE: This will execute the gateway on 0.0.0.0:8001, to see info about the endpoints go to 0.0.0.0:80001/docs


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

then:
```bash
go mod init mailserver && go mod tidy
```

NOTE: this will build the go program to be used on the cli app, you need golang installed. To install it see the docs: [golang docs](https://go.dev/dl/)
NOTE: when you execute the cli script the go server will start in the 8002 port.

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
- the ollama gateway
- the cli script

## Running the cli script
```bash
pip install -r requirements.txt
python cli.py
```

All the information about how to run this modules is on the prerequisites section.
