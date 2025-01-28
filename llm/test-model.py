import requests
import re

# --------------------------------------
# UCF Model & Verilog Model Endpoints
# --------------------------------------
UCF_API_URL = "http://localhost:8001/v1/models/ucf"
VERILOG_API_URL = "http://localhost:8001/v1/models/verilog"
CELLO_API_URL = "http://localhost:8000/v1/run"
MAIL_API_URL  = "http://localhost:8989/v1/mail/send"

# Example UCF Options
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

    def start(self):
        """
        Main method to guide the user through the flow.
        """
        print("Welcome to Genetic Design Chat!")
        print("---------------------------------\n")
        
        # Manual or automatic ucf
        self.ask_ucf_mode()
        print(f"\nUCF Selected: {self.selected_ucf_name}\n")
        
        # Verilog design
        self.handle_verilog_interaction()
        self.generate_verilog()
        
        # Cello
        self.run_cello()
        
        # Email
        self.ask_send_email()

        print("\nAll done! If you want to start a new design, just restart the chat.\n")

    # -------------------------------
    # how to pick a UCF
    # -------------------------------
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

    # --------------------------------------
    # If auto -> call /v1/models/ucf
    # --------------------------------------
    def auto_select_ucf(self):
        user_spec = input("Please enter your design specs (e.g. organism, outputs, logic gates, etc.): ").strip()
        payload = {"question": user_spec}
        
        try:
            resp = requests.post(UCF_API_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()  # => { "answer": "Eco1C1G1T1" } or something similar
            answer = data.get("answer", "Eco1C1G1T1")
            # Just store it
            self.selected_ucf_name = answer
            print(f"Auto selection returned: {answer}")
        except Exception as e:
            print(f"Error calling UCF API: {e}")
            # fallback
            self.selected_ucf_name = "Eco1C1G1T1"
            print("Falling back to default UCF: Eco1C1G1T1")

    # --------------------------------------
    # If manual -> show user the known UCFs
    # --------------------------------------
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

    # --------------------------------
    #   Verilog
    # --------------------------------
    def handle_verilog_interaction(self):
        """
        TODO: have a loop here to ask clarifying questions until the user is satisfied.
        """
        print("\nNow let's prepare to generate the Verilog code.")
        print("Feel free to specify your logic, inputs/outputs, etc.\n")
        
        while True:
            proceed = input("Are you ready to generate your Verilog? (y/n): ").strip().lower()
            if proceed == 'y':
                break
            elif proceed == 'n':
                print("Ok. Please refine your design. Type in any notes or constraints you'd like.\n")
                user_refinement = input("User refinement: ")
                # Here maybe call again the llm to refine the code.
            else:
                print("Please answer with 'y' or 'n'.")

    # -------------------------------------------
    # Generate Verilog from final prompt
    # -------------------------------------------
    def generate_verilog(self):
        final_prompt = input("Please describe your final circuit design for Verilog generation: ").strip()
        payload = {"question": final_prompt}
        try:
            resp = requests.post(VERILOG_API_URL, json=payload)
            resp.raise_for_status()
            data = resp.json()   # => { "answer": "... verilog code ..." }
            verilog_code = data.get("answer", "")
            
            # Extract `module ... endmodule` if needed
            mod_pattern = r'(module\s+.*?endmodule)'
            match = re.search(mod_pattern, verilog_code, re.DOTALL)
            if match:
                self.verilog_code = match.group(1)
            else:
                self.verilog_code = verilog_code

            print("\nGenerated Verilog Code:\n")
            print(self.verilog_code)
            print("\nVerilog generation complete.\n")
        except Exception as e:
            print(f"Error generating Verilog code: {e}")
            self.verilog_code = ""

    # -------------------------------------------
    # Call Cello with UCF + Verilog
    # -------------------------------------------
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
        except Exception as e:
            print(f"Error calling Cello API: {e}")

    def map_ucf_to_index(self, ucf_name: str) -> int:
        """
        If your Cello backend expects an ID for the UCF index,
        you can map them here. This is just a simple example.
        """
        for entry in UCF_OPTIONS:
            if entry["name"] == ucf_name:
                return entry["id"]
        return 1  # default fallback

    # --------------------------------------
    # Offer to email the results
    # --------------------------------------
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
            # For demonstration, assume the files are in a "Downloads" folder
            attachment_path = f"Downloads/{self.folder_name}"
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


if __name__ == "__main__":
    flow = ChatFlow()
    flow.start()
