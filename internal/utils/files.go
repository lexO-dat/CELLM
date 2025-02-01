package utils

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
)

// DownloadFile downloads a file from a URL and saves it into saveDir with the given filename.
func DownloadFile(url, saveDir, fileName string) error {
	resp, err := http.Get(url)
	if err != nil {
		return fmt.Errorf("failed to download %s: %w", fileName, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to download %s: status %s", fileName, resp.Status)
	}

	// Read the file data.
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("error reading file %s: %w", fileName, err)
	}

	// Ensure the save directory exists.
	if err := os.MkdirAll(saveDir, os.ModePerm); err != nil {
		return fmt.Errorf("failed to create directory %s: %w", saveDir, err)
	}

	filePath := filepath.Join(saveDir, fileName)
	if err := os.WriteFile(filePath, data, 0644); err != nil {
		return fmt.Errorf("failed to write file %s: %w", fileName, err)
	}
	return nil
}
