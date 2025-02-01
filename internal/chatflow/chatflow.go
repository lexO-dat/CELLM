package chatflow

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	"cli/internal/apiclient"
	"cli/internal/emailer"
	"cli/internal/utils"
)

// UCFOption represents a UCF file option.
type UCFOption struct {
	ID   int
	Name string
}

// UCF_OPTIONS are available options.
var UCF_OPTIONS = []UCFOption{
	{ID: 0, Name: "Bth1C1G1T1"},
	{ID: 1, Name: "Eco1C1G1T1"},
	{ID: 2, Name: "Eco1C2G2T2"},
	{ID: 3, Name: "Eco2C1G3T1"},
	{ID: 4, Name: "Eco2C1G5T1"},
	{ID: 5, Name: "SC1C1G1T1"},
}

// ChatFlow holds the state of the conversation.
type ChatFlow struct {
	selectedUCFName string
	verilogCode     string
	folderName      string
	outputFiles     []string
}

// NewChatFlow returns a new ChatFlow instance.
func NewChatFlow() *ChatFlow {
	return &ChatFlow{}
}

// Start kicks off the conversation.
func (cf *ChatFlow) Start() {
	fmt.Println("Welcome to Genetic Design Chat!")
	fmt.Println("---------------------------------\n")

	cf.askUCFMode()
	fmt.Printf("\nUCF Selected: %s\n\n", cf.selectedUCFName)

	cf.handleVerilogInteraction()
	cf.runCello()
	cf.askSendEmail()

	fmt.Println("\nAll done! If you want to start a new design, just restart the chat.\n")
}

func (cf *ChatFlow) askUCFMode() {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("\nDo you want to automatically select a UCF based on your design specs? (y/n): ")
		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(strings.ToLower(choice))
		if choice == "y" {
			cf.autoSelectUCF()
			break
		} else if choice == "n" {
			cf.manualSelectUCF()
			break
		} else {
			fmt.Println("Please answer with y or n.")
		}
	}
}

func (cf *ChatFlow) autoSelectUCF() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Print("Please enter your design specs (e.g. organism, outputs, logic gates, etc.): ")
	userSpec, _ := reader.ReadString('\n')
	userSpec = strings.TrimSpace(userSpec)

	// Call the UCF API client function.
	answer, err := apiclient.AutoSelectUCF(userSpec)
	if err != nil {
		fmt.Println("Error from UCF API:", err)
		answer = "Eco1C1G1T1" // fallback
		fmt.Println("Falling back to default UCF: Eco1C1G1T1")
	}
	cf.selectedUCFName = answer
	fmt.Printf("Auto selection returned: %s\n", answer)
}

func (cf *ChatFlow) manualSelectUCF() {
	fmt.Println("\nAvailable UCF Files:")
	for _, ucf := range UCF_OPTIONS {
		fmt.Printf("%d: %s\n", ucf.ID, ucf.Name)
	}

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("\nWhich UCF ID would you like to use?: ")
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)
		choice, err := strconv.Atoi(input)
		if err != nil {
			fmt.Println("Invalid input. Please enter a valid number.")
			continue
		}
		if choice >= 0 && choice < len(UCF_OPTIONS) {
			cf.selectedUCFName = UCF_OPTIONS[choice].Name
			fmt.Printf("Manually selected UCF: %s\n", cf.selectedUCFName)
			return
		} else {
			fmt.Println("Invalid ID. Please try again.")
		}
	}
}

func (cf *ChatFlow) handleVerilogInteraction() {
	reader := bufio.NewReader(os.Stdin)
	fmt.Println("\nNow let's refine your Verilog design.")
	fmt.Println("You can ask questions about logic, inputs/outputs, truth table, etc.\n")

	for {
		fmt.Print("\nType 'r' to start refining your Verilog code or 'done' to finish: ")
		userAction, _ := reader.ReadString('\n')
		userAction = strings.TrimSpace(strings.ToLower(userAction))

		if userAction == "done" {
			if cf.verilogCode != "" {
				fmt.Println("\nProceeding with the generated Verilog code.")
			} else {
				fmt.Println("\nNo Verilog code found. Proceeding without it.")
			}
			return
		} else if userAction == "r" {
			fmt.Println("\nEntering refinement mode. You can now chat with the model. Type 'done' when finished.\n")
			for {
				fmt.Print("Your question/refinement (or 'done' to finish): ")
				userInput, _ := reader.ReadString('\n')
				userInput = strings.TrimSpace(userInput)
				if strings.ToLower(userInput) == "done" {
					if cf.verilogCode != "" {
						fmt.Println("\nExiting refinement mode. Found a Verilog module.")
						fmt.Println("\n--- Extracted Verilog Module ---")
						fmt.Println(cf.verilogCode)
						fmt.Println("---------------------------------\n")
					} else {
						fmt.Println("\nExiting refinement mode. No Verilog module detected.")
					}
					break
				}

				// Call the Verilog API client.
				aiAnswer, err := apiclient.RefineVerilog(userInput)
				if err != nil {
					fmt.Println("Error from Verilog API:", err)
					continue
				}

				thinkingPart, responsePart := cf.parseResponse(aiAnswer)

				if thinkingPart != "" {
					fmt.Println("\n----- Model Thinking -----")
					fmt.Println(thinkingPart)
					fmt.Println("---------------------------\n")
				}

				fmt.Println("\n----- Model Response -----")
				fmt.Println(strings.TrimSpace(responsePart))
				fmt.Println("---------------------------\n")

				moduleCode := cf.extractVerilogModule(responsePart)
				if moduleCode != "" {
					cf.verilogCode = moduleCode
					fmt.Println("\n--- Extracted Verilog Module ---")
					fmt.Println(moduleCode)
					fmt.Println("---------------------------------\n")
				} else {
					fmt.Println("No Verilog module detected in the response.\n")
					cf.verilogCode = ""
				}
			}
		} else {
			fmt.Println("Invalid input. Please type 'r' to refine or 'done' to proceed.")
		}
	}
}

// parseResponse separates the "thinking" part and the main response.
func (cf *ChatFlow) parseResponse(response string) (string, string) {
	thinkingPart := ""
	responsePart := response
	if strings.Contains(response, "</think>") {
		parts := strings.SplitN(response, "</think>", 2)
		thinkingPart = strings.TrimSpace(parts[0])
		responsePart = strings.TrimSpace(parts[1])
	}
	return thinkingPart, responsePart
}

// extractVerilogModule uses a regular expression to extract a Verilog module block.
func (cf *ChatFlow) extractVerilogModule(text string) string {
	re := regexp.MustCompile(`(?s)module\s+.*?endmodule`)
	match := re.FindString(text)
	return strings.TrimSpace(match)
}

func (cf *ChatFlow) runCello() {
	if cf.verilogCode == "" {
		fmt.Println("No Verilog code to process. Exiting early.")
		return
	}
	fmt.Println("Sending design to Cello for processing...")

	// Map UCF name to index.
	ucfIndex := cf.mapUCFToIndex(cf.selectedUCFName)

	// Call the Cello API client.
	folder, outputs, err := apiclient.RunCello(cf.verilogCode, ucfIndex)
	if err != nil {
		fmt.Println("Error calling Cello API:", err)
		return
	}
	cf.folderName = folder
	cf.outputFiles = outputs

	fmt.Println("\nCello Processing Completed:")
	fmt.Printf("Folder Name: %s\n", cf.folderName)
	fmt.Println("Generated Files:")
	for _, f := range cf.outputFiles {
		fmt.Printf("  - %s\n", f)
	}

	// Download each output file.
	if cf.folderName != "" && len(cf.outputFiles) > 0 {
		for _, f := range cf.outputFiles {
			savePath := filepath.Join("Downloads", cf.folderName)
			fileURL := fmt.Sprintf("http://localhost:8000/v1/outputs/%s/%s", cf.folderName, f)
			if err := utils.DownloadFile(fileURL, savePath, f); err != nil {
				fmt.Printf("Error downloading file %s: %v\n", f, err)
			} else {
				fmt.Printf("Downloaded: %s\n", filepath.Join(savePath, f))
			}
		}
	}
}

func (cf *ChatFlow) mapUCFToIndex(ucfName string) int {
	for _, entry := range UCF_OPTIONS {
		if entry.Name == ucfName {
			return entry.ID
		}
	}
	return 1
}

func (cf *ChatFlow) askSendEmail() {
	if cf.folderName == "" || len(cf.outputFiles) == 0 {
		fmt.Println("No generated files to send. Skipping email step.")
		return
	}

	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Print("\nDo you want to send the generated files via email? (y/n): ")
		choice, _ := reader.ReadString('\n')
		choice = strings.TrimSpace(strings.ToLower(choice))
		if choice == "y" {
			fmt.Print("Please enter the email address: ")
			emailAddr, _ := reader.ReadString('\n')
			emailAddr = strings.TrimSpace(emailAddr)
			if err := emailer.SendResults(emailAddr, cf.folderName); err != nil {
				fmt.Printf("Error sending email: %v\n", err)
			} else {
				fmt.Println("Email sent successfully!")
			}
			break
		} else if choice == "n" {
			fmt.Println("Files not sent. Process complete.")
			break
		} else {
			fmt.Println("Please answer with y or n.")
		}
	}
}
