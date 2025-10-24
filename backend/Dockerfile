FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY . /app

RUN chmod +x /app/entrypoint.sh

ENV PYTHONPATH=/app \
    DB_HOST=db \
    DB_PORT=5432

EXPOSE 8000

ENTRYPOINT ["/app/entrypoint.sh"]
