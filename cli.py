import requests
import re
import os
# import subprocess

# --------------------------------------
# UCF Model & Verilog Model Endpoints
# --------------------------------------
UCF_API_URL = "http://localhost:8001/v1/models/ucf"
VERILOG_API_URL = "http://localhost:8001/v1/models/verilog"
CELLO_API_URL = "http://localhost:8000/v1/run"
MAIL_API_URL = "http://localhost:8002/v1/mail/send"

# UCF Options
UCF_OPTIONS = [
    {"id": 0, "name": "Bth1C1G1T1"},
    {"id": 1, "name": "Eco1C1G1T1"},
    {"id": 2, "name": "Eco1C2G2T2"},
    {"id": 3, "name": "Eco2C1G3T1"},
    {"id": 4, "name": "Eco2C1G5T1"},
    {"id": 5, "name": "SC1C1G1T1"},
]

class ChatFlow:
    def __init__(self):
        self.selected_ucf_name = None
        self.verilog_code = None
        self.folder_name = None
        self.output_files = []
        
        # Subprocess reference for the Go mail server
        #self.go_server_process = None

        # Automatically start the Go mail server, just like the old code
        #self.start_go_server()

    def start(self):
        """
        Main method to guide the user through the flow.
        """
        print("Welcome to Genetic Design Chat!")
        print("---------------------------------\n")
        
        # Manual or automatic UCF
        self.ask_ucf_mode()
        print(f"\nUCF Selected: {self.selected_ucf_name}\n")
        
        # Verilog design
        self.handle_verilog_interaction()
        
        # Cello
        self.run_cello()
        
        # Email
        self.ask_send_email()

        print("\nAll done! If you want to start a new design, just restart the chat.\n")

    # ------------------------------------------------
    # UCF
    # ------------------------------------------------
    def ask_ucf_mode(self):
        while True:
            choice = input("\n Do you want to automatically select a UCF based on your design specs? (y/n): ").strip().lower()
            if choice == 'y':
                self.auto_select_ucf()
                break
            elif choice == 'n':
                self.manual_select_ucf()
                break
            else:
                print("Please answer with y or n.")

    def auto_select_ucf(self):
        user_spec = input("Please enter your design specs (e.g. organism, outputs, logic gates, etc.): ").strip()
        payload = {"question": user_spec}
        
        try:
            resp = requests.post(UCF_API_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()  # { "answer": "Eco1C1G1T1" } or something similar
            answer = data.get("answer", "Eco1C1G1T1")
            self.selected_ucf_name = answer
            print(f"Auto selection returned: {answer}")
        except Exception as e:
            print(f"Error calling UCF API: {e}")
            # fallback
            self.selected_ucf_name = "Eco1C1G1T1"
            print("Falling back to default UCF: Eco1C1G1T1")

    def manual_select_ucf(self):
        print("\nAvailable UCF Files:")
        for ucf in UCF_OPTIONS:
            print(f"{ucf['id']}: {ucf['name']}")
        
        while True:
            try:
                choice = int(input("\nWhich UCF ID would you like to use?: "))
                if 0 <= choice < len(UCF_OPTIONS):
                    self.selected_ucf_name = UCF_OPTIONS[choice]["name"]
                    print(f"Manually selected UCF: {self.selected_ucf_name}")
                    return
                else:
                    print("Invalid ID. Please try again.")
            except ValueError:
                print("Invalid input. Please enter a valid number.")

    # ------------------------------------------------
    # Verilog Interaction
    # ------------------------------------------------
    def handle_verilog_interaction(self):
        print("\nNow let's refine your Verilog design.")
        print("You can ask questions about logic, inputs/outputs, truth table, etc.\n")

        while True:
            user_action = input("\nType 'r' to start refining your Verilog code or 'done' to finish: ").strip().lower()

            if user_action == 'done':
                if self.verilog_code:
                    print("\nProceeding with the generated Verilog code.")
                else:
                    print("\nNo Verilog code found. Proceeding without it.")
                return
            
            elif user_action == 'r':
                print("\nEntering refinement mode. You can now chat with the model. Type 'done' when finished.\n")
                while True:
                    user_input = input("Your question/refinement (or 'done' to finish): ").strip()
                    if user_input.lower() == 'done':
                        if self.verilog_code:
                            print("\nExiting refinement mode. Found a Verilog module.")
                            print("\n--- Extracted Verilog Module ---")
                            print(self.verilog_code)
                            print("---------------------------------\n")
                        else:
                            print("\nExiting refinement mode. No Verilog module detected.")
                        break
                    try:
                        resp = requests.post(VERILOG_API_URL, json={"question": user_input})
                        resp.raise_for_status()
                        data = resp.json()
                        ai_answer = data.get("answer", "")
                        
                        # Split into thinking and response parts
                        thinking_part, response_part = "", ai_answer
                        if '</think>' in ai_answer:
                            parts = ai_answer.split('</think>', 1)
                            thinking_part = parts[0].strip()
                            response_part = parts[1].strip()
                        
                        # Print thinking part if present
                        if thinking_part:
                            print("\n----- Model Thinking -----")
                            print(thinking_part)
                            print("---------------------------\n")
                        
                        # Print response part
                        print("\n----- Model Response -----")
                        print(response_part.strip())
                        print("---------------------------\n")
                        
                        # Extract module from response part
                        module_code = self.extract_verilog_module(response_part)
                        if module_code:
                            self.verilog_code = module_code
                            print("\n--- Extracted Verilog Module ---")
                            print(module_code)
                            print("---------------------------------\n")
                        else:
                            print("No Verilog module detected in the response.\n")
                            self.verilog_code = None
                    except Exception as e:
                        print(f"Error communicating with Verilog API: {e}")
            else:
                print("Invalid input. Please type 'r' to refine or 'done' to proceed.")

    def extract_verilog_module(self, text: str) -> str:
        """
        Extracts the first Verilog module block from the given text.
        """
        mod_pattern = r'(module\s+.*?endmodule)'
        match = re.search(mod_pattern, text, re.DOTALL)
        return match.group(1).strip() if match else ""

    # ------------------------------------------------
    # Call Cello with UCF + Verilog
    # ------------------------------------------------
    def run_cello(self):
        if not self.verilog_code:
            print("No Verilog code to process. Exiting early.")
            return
        print("Sending design to Cello for processing...")
        try:
            resp = requests.post(
                CELLO_API_URL,
                json={
                    "verilogCode": self.verilog_code,
                    "ucfIndex": self.map_ucf_to_index(self.selected_ucf_name),
                    "options": {
                        "verbose": True,
                        "log_overwrite": False,
                        "print_iters": False,
                        "exhaustive": False,
                        "test_configs": False,
                    },
                },
            )
            resp.raise_for_status()
            data = resp.json()
            
            self.folder_name = data.get("folder_name", "")
            self.output_files = data.get("output_files", [])
            
            print("\nCello Processing Completed:")
            print(f"Folder Name: {self.folder_name}")
            print("Generated Files:")
            for f in self.output_files:
                print(f"  - {f}")

            if self.folder_name and self.output_files:
                for f in self.output_files:
                    self.download_file(self.folder_name, f)
            
        except Exception as e:
            print(f"Error calling Cello API: {e}")

    def map_ucf_to_index(self, ucf_name: str) -> int:
        for entry in UCF_OPTIONS:
            if entry["name"] == ucf_name:
                return entry["id"]
        return 1

    def download_file(self, folder_name, file_name):
        """
        Download a file from the cello server's output folder, 
        same approach as the old code.
        """
        url = f"http://localhost:8000/v1/outputs/{folder_name}/{file_name}"
        try:
            response = requests.get(url)
            response.raise_for_status()

            save_path = os.path.join("Downloads", folder_name)
            os.makedirs(save_path, exist_ok=True)
            file_path = os.path.join(save_path, file_name)

            with open(file_path, "wb") as f:
                f.write(response.content)

            print(f"Downloaded: {file_path}")
        except Exception as e:
            print(f"Failed to download {file_name}: {e}")

    # ------------------------------------------------
    # Offer to Email
    # ------------------------------------------------
    def ask_send_email(self):
        if not (self.folder_name and self.output_files):
            print("No generated files to send. Skipping email step.")
            return
        
        while True:
            choice = input("\nDo you want to send the generated files via email? (y/n): ").strip().lower()
            if choice == 'y':
                email = input("Please enter the email address: ").strip()
                self.send_email(email)
                break
            elif choice == 'n':
                print("Files not sent. Process complete.")
                break
            else:
                print("Please answer with y or n.")

    def send_email(self, email: str):
        try:
            attachment_path = os.path.join("Downloads", self.folder_name)
            payload = {
                "destinatario": email,
                "subject": "Sending all the generated files by geneticAI app",
                "attachmentPath": attachment_path
            }
            resp = requests.post(MAIL_API_URL, json=payload)
            resp.raise_for_status()
            print("Email sent successfully.")
        except Exception as e:
            print(f"Error sending email: {e}")

    # ------------------------------------------------
    # Starting & Stopping Go Server
    # ------------------------------------------------
    # def start_go_server(self):
    # """
    #    Start the Go mailserver in a subprocess. 
    #    This replicates the first code's approach.
    #    """
    #    try:
    #        mailserver_path = os.path.abspath("mailserver")
    #        if not os.path.isdir(mailserver_path):
    #            raise FileNotFoundError(f"Mailserver folder not found at {mailserver_path}")

    #        self.go_server_process = subprocess.Popen(
    #            ["go", "run", "main.go"],
    #           cwd=mailserver_path,
    #            stdout=subprocess.PIPE,
    #            stderr=subprocess.PIPE,
    #        )
    #        print(f"[MailServer] Go server is running in the background with PID {self.go_server_process.pid}")
    #    except Exception as e:
    #        print(f"Failed to start Go server: {e}")
    #        self.go_server_process = None

    # def stop_go_server(self):
    #     """
    #     Stop the Go server subprocess.
    #    """
    #    if self.go_server_process:
    #        try:
    #            self.go_server_process.terminate()
    #            self.go_server_process.wait()
    #            print("Go server has been terminated.")
    #        except Exception as e:
    #            print(f"Failed to stop Go server: {e}")

    # def __del__(self):
    #    self.stop_go_server()

if __name__ == "__main__":
    flow = ChatFlow()
    # try:
    flow.start()
    # finally:
    #    flow.stop_go_server()
