package main

import (
	"fmt"

	"cli/internal/chatflow"

	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		fmt.Println("Warning: Error loading .env file", err)
	}

	flow := chatflow.NewChatFlow()
	flow.Start()
}
