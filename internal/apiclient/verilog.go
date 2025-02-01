package apiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const VERILOG_API_URL = "http://localhost:8001/v1/models/verilog"

// RefineVerilog sends a question to the Verilog API and returns the model's answer.
func RefineVerilog(question string) (string, error) {
	payload := map[string]string{"question": question}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("error marshaling payload: %w", err)
	}

	resp, err := http.Post(VERILOG_API_URL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return "", fmt.Errorf("error communicating with Verilog API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Verilog API returned non-200 status: %s", resp.Status)
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return "", fmt.Errorf("error decoding Verilog API response: %w", err)
	}

	aiAnswer, ok := data["answer"].(string)
	if !ok {
		aiAnswer = ""
	}
	return aiAnswer, nil
}
