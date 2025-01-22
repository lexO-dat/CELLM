#!/bin/bash
ollama serve &
sleep 5

ollama pull llama3.1:8b
ollama pull mxbai-embed-large:latest
ollama create custom-llama-8b -f /root/.ollama/custom-llama

pkill ollama