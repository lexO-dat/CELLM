FROM python:3.9-slim-bullseye

RUN apt update && apt install -y \
    golang \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . /app

RUN pip install --no-cache-dir -r requirements.txt

CMD ["python", "cli.py"]
