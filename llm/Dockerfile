FROM python:3.11-slim
RUN apt update && apt install -y curl && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://ollama.com/install.sh | sh

# Set the working directory.
WORKDIR /app

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY custom-llama .

COPY Ollama_gateway.py .

COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

EXPOSE 8001

CMD ["./entrypoint.sh"]
