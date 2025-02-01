package apiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const CELLO_API_URL = "http://localhost:8000/v1/run"

// RunCello sends the Verilog code and UCF information to the Cello API.
func RunCello(verilogCode string, ucfIndex int) (folderName string, outputFiles []string, err error) {
	payload := map[string]interface{}{
		"verilogCode": verilogCode,
		"ucfIndex":    ucfIndex,
		"options": map[string]bool{
			"verbose":       true,
			"log_overwrite": false,
			"print_iters":   false,
			"exhaustive":    false,
			"test_configs":  false,
		},
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", nil, fmt.Errorf("error marshaling payload: %w", err)
	}

	resp, err := http.Post(CELLO_API_URL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", nil, fmt.Errorf("error calling Cello API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", nil, fmt.Errorf("Cello API returned non-200 status: %s", resp.Status)
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", nil, fmt.Errorf("error decoding Cello API response: %w", err)
	}

	folderName, _ = data["folder_name"].(string)
	if outputFilesInterface, ok := data["output_files"].([]interface{}); ok {
		for _, v := range outputFilesInterface {
			if s, ok := v.(string); ok {
				outputFiles = append(outputFiles, s)
			}
		}
	}

	return folderName, outputFiles, nil
}
