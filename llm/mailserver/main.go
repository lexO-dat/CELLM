package main

import (
	"encoding/json"
	"fmt"
	"log"
	"mailserver/mail"
	"net/http"
	"os"
	"path/filepath"

	"github.com/joho/godotenv"
)

// --------------------------------------------
// Loading all the .env variables
// --------------------------------------------
func init() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Advertencia: no se carg?? el archivo .env, utilizando variables de entorno del sistema.")
	}
}

// -------------------------------------------
// Structure of the request of the api:
// params
/*
	- Destination: email of destination
	- Subject: subject of the email
	- AttachmentPath: path of the folder to send the email
*/
// if you want to modify this code to implement more things just add more params with ths structure:
// - < name > < variable type > `json: " < name > "`
// -------------------------------------------

type EmailRequest struct {
	Destinatario   string `json:"destinatario"`
	Subject        string `json:"subject"`
	AttachmentPath string `json:"attachmentPath"`
}

// ---------------------------------------------------------------------------
// Get all the files from the specified folder to send all the files inside it
// ---------------------------------------------------------------------------
func getFilesFromFolder(folderPath string) ([]string, error) {
	var files []string

	if _, err := os.Stat(folderPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("folder does not exist: %s", folderPath)
	}

	err := filepath.Walk(folderPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			files = append(files, path)
		}
		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error walking through folder: %v", err)
	}
	return files, nil
}

// -----------------------------------------
// All the CORS middleware configuration
// -----------------------------------------
func enableCors(w *http.ResponseWriter) {
	(*w).Header().Set("Access-Control-Allow-Origin", "*")
	(*w).Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	(*w).Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func sendEmailHandler(w http.ResponseWriter, r *http.Request) {
	enableCors(&w)
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var emailReq EmailRequest
	err := json.NewDecoder(r.Body).Decode(&emailReq)
	if err != nil {
		http.Error(w, "Error processing the json: "+err.Error(), http.StatusBadRequest)
		return
	}
	if emailReq.Destinatario == "" || emailReq.Subject == "" || emailReq.AttachmentPath == "" {
		http.Error(w, "Required fields missing", http.StatusBadRequest)
		return
	}

	var attachFiles []string
	if emailReq.AttachmentPath != "" {
		files, err := getFilesFromFolder(emailReq.AttachmentPath)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error obtaining all the attached files: %v", err), http.StatusBadRequest)
			return
		}
		attachFiles = files
	}

	content := fmt.Sprintf(`
		<!DOCTYPE html>
		<html lang="es">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
		</head>
		<body>
			<h1>Thank you for using my app!</h1>
		</body>
		</html>
    `)

	// ------------------------------
	// Call of all the env variables
	// ------------------------------
	sender := mail.NewGmailSender(
		os.Getenv("EMAIL_SENDER_NAME"),
		os.Getenv("EMAIL_SENDER_ADDRESS"),
		os.Getenv("EMAIL_SENDER_PASSWORD"),
	)

	to := []string{emailReq.Destinatario}
	err = sender.SendEmail(emailReq.Subject, content, to, nil, nil, attachFiles)
	if err != nil {
		http.Error(w, fmt.Sprintf("Error al enviar el correo: %v", err), http.StatusInternalServerError)
		return
	}

	response := struct {
		Message          string `json:"message"`
		AttachmentsCount int    `json:"attachments_count"`
	}{
		Message:          "Mail sent successfully",
		AttachmentsCount: len(attachFiles),
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(response)
}

func main() {
	http.HandleFunc("/v1/mail/send", sendEmailHandler)
	fmt.Println("Server listening on port 8002...")
	log.Fatal(http.ListenAndServe(":8002", nil))
}

/*

curl -X POST http://localhost:8002/v1/mail/send \
     -H "Content-Type: application/json" \
     -d '{
           "destinatario": "a@gmail.com",
           "subject": "Sending all the generated files by geneticAI app",
           "attachmentPath": "/home/lexo/Desktop/Practica/Downloads/temp_c00297a3f8824a3aafe95fdd8e30f396"
         }'
*/
