package apiclient

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
)

const (
	UCF_API_URL   = "http://localhost:8001/v1/models/ucf"
	defaultUCFVal = "Eco1C1G1T1"
)

// AutoSelectUCF sends design specs to the UCF API and returns the selected UCF name.
func AutoSelectUCF(userSpec string) (string, error) {
	payload := map[string]string{"question": userSpec}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return defaultUCFVal, fmt.Errorf("error marshaling payload: %w", err)
	}

	resp, err := http.Post(UCF_API_URL, "application/json", bytes.NewBuffer(payloadBytes))
	if err != nil {
		return defaultUCFVal, fmt.Errorf("error calling UCF API: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return defaultUCFVal, fmt.Errorf("UCF API returned non-200 status: %s", resp.Status)
	}

	var data map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return defaultUCFVal, fmt.Errorf("error decoding UCF API response: %w", err)
	}

	answer, ok := data["answer"].(string)
	if !ok || answer == "" {
		answer = defaultUCFVal
	}
	return answer, nil
}
