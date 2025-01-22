FROM ollama/ollama:latest

WORKDIR /root/.ollama

COPY ./custom-llama /root/.ollama/custom-llama
COPY ./setup.sh /root/.ollama/setup.sh

RUN chmod +x /root/.ollama/setup.sh
EXPOSE 11434

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["/root/.ollama/setup.sh && ollama serve"]