#!/bin/bash
ollama serve &
sleep 5

ollama pull deepseek-r1:7b
ollama create custom-llama-7b-r -f /root/.ollama/custom-llama
ollama pull mxbai-embed-large:latest

pkill ollama