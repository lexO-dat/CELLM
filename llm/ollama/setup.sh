#!/bin/bash
ollama serve &
sleep 5

ollama pull deepseek-r1:32b
ollama create custom-r1 -f /root/.ollama/custom-llama-r
ollama pull mxbai-embed-large:latest

pkill ollama
