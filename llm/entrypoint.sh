#!/bin/bash
set -e

echo "Starting Ollama server..."
ollama serve &

sleep 5

echo "Pulling required models..."
ollama pull deepseek-r1:32b
# ollama pull deepseek-r1:7b
ollama serve &
ollama pull phi4
ollama serve &
ollama pull mxbai-embed-large:latest
ollama serve &

echo "Creating custom model from custom_model.txt..."
ollama create verilog-r1-32b -f custom-llama
# ollama create verilog-r1-7b -f custom-llama
ollama serve &

echo "Starting Ollama server..."
exec python Ollama_gateway.py