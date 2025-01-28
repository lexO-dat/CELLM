import requests
import os
from llm import Ollama_gateway
import subprocess
import re

ucf_options = [
    {"id": 0, "name": "Bth1C1G1T1"},
    {"id": 1, "name": "Eco1C1G1T1"},
    {"id": 2, "name": "Eco1C2G2T2"},
    {"id": 3, "name": "Eco2C1G3T1"},
    {"id": 4, "name": "Eco2C1G5T1"},
    {"id": 5, "name": "SC1C1G1T1"},
]

class ChatApp:
    def __init__(self):
        self.messages = []
        self.selected_ucf = 1
        self.folder_name = ""
        self.output_files = []
        self.manual_ucf = False
        self.go_server_process = None

        self.start_go_server()

    def print_box(self, message):
        """Dynamically generate an ASCII box around the given message."""
        top = f"/{'-' * len(message)}\\"
        middle = f"|{message}|"
        bottom = f"\\{'-' * len(message)}/"
        print(top)
        print(middle)
        print(bottom)

    def display_ucf_options(self):
        """Display UCF options."""
        print("\nAvailable UCF Options:")
        for ucf in ucf_options:
            print(f"{ucf['id']}: {ucf['name']}")

    def set_ucf(self, ucf_id):
        """Set the selected UCF manually."""
        if 0 <= ucf_id < len(ucf_options):
            self.selected_ucf = ucf_id
            self.manual_ucf = True
            print(f"Selected UCF (Manual): {ucf_options[ucf_id]['name']}\n")
        else:
            print("Invalid UCF ID. Please try again.")

    # ---------------------------------------------------
    # Automated UCF Selection if there is no manual UCF selected
    # ---------------------------------------------------
    def auto_select_ucf(self, input_message):
        if self.manual_ucf:
            return
        self.print_box("Bot: Automatically selecting UCF based on input...")
        try:
            response = Ollama_gateway.chat_response(str(input_message))
            selected_ucf_name = response
            
            # Match UCF name to ID
            for ucf in ucf_options:
                if ucf['name'] == selected_ucf_name:
                    self.selected_ucf = ucf['id']
                    print(f"Bot: Auto-selected UCF: {ucf['name']}")
                    return
            self.print_box("Bot: Failed to detect UCF. Using default UCF.")
            self.selected_ucf = 1
        except Exception as e:
            print(f"Error selecting UCF: {e}")

    # ---------------------------------------------------
    # Sending message method
    # ---------------------------------------------------
    def send_message(self, input_message):
        if not input_message.strip():
            print("Message cannot be empty.")
            return

        self.auto_select_ucf(input_message)
        self.print_box("Bot: Generating Verilog code...")
        verilog_code = self.generate_verilog(input_message)
        if not verilog_code:
            print("Bot: Failed to generate Verilog code.")
            return

        self.print_box("Bot: Processing with Cello...")
        self.process_with_cello(verilog_code)

        self.ask_email_confirmation()

    # ---------------------------------------------------
    # Generate Verilog method, it calls the api gateway of ollama
    # ---------------------------------------------------
    def generate_verilog(self, prompt):
        """Generate Verilog code via API and extract module definition."""
        try:
            response = Ollama_gateway.verilog_generation(str(prompt))
            responseText = response

            module_pattern = r'module\s+.*?endmodule'
            matches = re.findall(module_pattern, responseText, re.DOTALL)
            
            if matches:
                extracted_code = matches[0]
                print(f"Bot: Generated Verilog Code:\n{extracted_code}")
                return extracted_code
            else:
                print("No Verilog module found in the generated code.")
                return ""
                
        except Exception as e:
            print(f"Error generating Verilog: {e}")
            return ""

    # ---------------------------------------------------
    # Process with Cello method, it process the generated verilog code
    # ---------------------------------------------------
    def process_with_cello(self, verilog_code):
        """Process Verilog code with Cello API."""
        try:
            cello_response = requests.post(
                "http://localhost:8000/v1/run",
                json={
                    "verilogCode": verilog_code,
                    "ucfIndex": self.selected_ucf,
                    "options": {
                        "verbose": True,
                        "log_overwrite": False,
                        "print_iters": False,
                        "exhaustive": False,
                        "test_configs": False,
                    },
                },
            )
            cello_response.raise_for_status()
            cello_data = cello_response.json()

            self.folder_name = cello_data.get("folder_name", "")
            self.output_files = cello_data.get("output_files", [])
		
            self.print_box("Bot: Cello Processing Completed!")
            print(f"|Bot: Folder Name - {self.folder_name}|")

            print("--------------------------------------------------------------------------------")
            print("Bot: Generated Files:")
            for file in self.output_files:
                print(f"|- {file}|")

            for file in self.output_files:
                self.download_file(self.folder_name, file)
            
            print("--------------------------------------------------------------------------------")

        except Exception as e:
            print(f"Error processing with Cello: {e}")

    def download_file(self, folder_name, file):
        """Download a file from the server."""
        url = f"http://localhost:8000/v1/outputs/{folder_name}/{file}"
        try:
            response = requests.get(url)
            response.raise_for_status()

            save_path = os.path.join("Downloads", folder_name)
            os.makedirs(save_path, exist_ok=True)
            file_path = os.path.join(save_path, file)

            with open(file_path, "wb") as f:
                f.write(response.content)

            print(f"Bot: Downloaded - {file_path}")

        except Exception as e:
            print(f"Failed to download {file}: {e}")

    def ask_email_confirmation(self):
        """Ask user for email confirmation to send files."""
        while True:
            user_input = input("Bot: Do you want to send the files via email? (y/n): ").strip().lower()
            if user_input == 'y':
                email = input("Bot: Please enter the email address: ").strip()
                if self.send_email(email):
                    print("Bot: Files sent successfully!")
                else:
                    print("Bot: Failed to send files. Please try again later.")
                break
            elif user_input == 'n':
                print("Bot: Okay, you can ask something else!")
                break
            else:
                print("Bot: Please answer with 'y' or 'n'.")

    def send_email(self, email):
        """Send files via email using the API."""
        try:
            absolute_attachment_path = os.path.abspath(os.path.join("Downloads", self.folder_name))
            print(absolute_attachment_path)

            response = requests.post(
                "http://localhost:8002/v1/mail/send",
                json={
                    "destinatario": email,
                    "subject": "Sending all the generated files by geneticAI app",
                    "attachmentPath": absolute_attachment_path,
                },
                headers={"Content-Type": "application/json"},
            )
            response.raise_for_status()
            return True
        except Exception as e:
            print(f"Error sending email: {e}")
            return False

    
    def start_go_server(self):
        """Start the Go server as a subprocess."""
        try:
            mailserver_path = os.path.abspath("mailserver")
        
            if not os.path.isdir(mailserver_path):
                raise FileNotFoundError(f"Mailserver folder not found at {mailserver_path}")
        
            self.go_server_process = subprocess.Popen(
                ["go", "run", "main.go"],
                cwd=mailserver_path,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
            )
        
            print(f"Go server is running in the background with PID {self.go_server_process.pid}")
        except Exception as e:
            print(f"Failed to start Go server: {e}")
            self.go_server_process = None
        
    def stop_go_server(self):
        """Stop the Go server subprocess."""
        if self.go_server_process:
            try:
                self.go_server_process.terminate()
                self.go_server_process.wait()
                print("Go server has been terminated.")
            except Exception as e:
                print(f"Failed to stop Go server: {e}")

    def __del__(self):
        """Ensure the Go server is stopped when the app exits."""
        self.stop_go_server()

    # ---------------------------------------------------
    # Main loop
    # ---------------------------------------------------
    def chat_loop(self):
        print("Welcome to the Chat CLI! Type 'exit' to quit.")
        print("Type 'ucf' to see UCF options or 'setucf [id]' to select a UCF.\n")

        try:
            while True:
                user_input = input("You: ")

                if user_input.lower() == "exit":
                    print("Goodbye!")
                    break
                elif user_input.lower() == "ucf":
                    self.display_ucf_options()
                elif user_input.lower().startswith("setucf"):
                    try:
                        _, ucf_id = user_input.split()
                        self.set_ucf(int(ucf_id))
                    except ValueError:
                        print("Invalid command. Usage: setucf [id]")
                else:
                    self.send_message(user_input)
        finally:
            self.stop_go_server()

if __name__ == "__main__":
    app = ChatApp()
    app.chat_loop()