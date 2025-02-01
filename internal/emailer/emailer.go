package emailer

import (
	"fmt"
	"os"
	"path/filepath"

	"cli/mail"

	"github.com/joho/godotenv"
)

// SendResults collects files from the Downloads folder and sends them via email.
func SendResults(recipient, folderName string) error {
	attachmentPath := filepath.Join("Downloads", folderName)
	files, err := getFilesFromFolder(attachmentPath)
	if err != nil {
		return fmt.Errorf("error getting attachment files: %w", err)
	}

	content := `<!DOCTYPE html>
				<html>
				<head>
					<title>Genetic Design Results</title>
				</head>
				<body>
					<h1>Thank you for using CELLM!</h1>
					<p>Your generated files are attached to this email.</p>
				</body>
				</html>`

	// Load environment variables.
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: Error loading .env file", err)
	}

	sender := mail.NewGmailSender(
		os.Getenv("EMAIL_SENDER_NAME"),
		os.Getenv("EMAIL_SENDER_ADDRESS"),
		os.Getenv("EMAIL_SENDER_PASSWORD"),
	)

	if err := sender.SendEmail(
		"Genetic Design Results",
		content,
		[]string{recipient},
		nil,
		nil,
		files,
	); err != nil {
		return fmt.Errorf("error sending email: %w", err)
	}

	return nil
}

// getFilesFromFolder walks the folder and returns a slice of file paths.
func getFilesFromFolder(folderPath string) ([]string, error) {
	var files []string

	err := filepath.Walk(folderPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			files = append(files, path)
		}
		return nil
	})

	return files, err
}
