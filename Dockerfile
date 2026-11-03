FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    APP_PORT=8000 \
    DATABASE_URL=sqlite:////data/meditrack.db \
    MODEL_ARTIFACT_DIR=/app/backend/ml/artifacts \
    SYNTHETIC_DATASET_PATH=/app/backend/ml/artifacts/synthetic_dataset.csv \
    MODEL_ARTIFACT_PATH=/app/backend/ml/artifacts/no_show_model.joblib

WORKDIR /app/backend

COPY backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ ./
RUN mkdir -p /data ml/artifacts

EXPOSE 8000
VOLUME ["/data"]

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-${APP_PORT}}"]