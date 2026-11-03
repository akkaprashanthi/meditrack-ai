from dotenv import load_dotenv
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_db
from ml.generate_dataset import generate_synthetic_dataset
from ml.train_model import train_and_save_model
from routers.analytics import router as analytics_router
from routers.appointments import router as appointments_router
from routers.followups import router as followups_router
from routers.recommendations import router as recommendations_router
from seed import seed_database
from services.cache_service import cache_service
from services.ml_service import ml_service
from settings import CORS_ORIGINS, DATASET_PATH, MODEL_PATH

app = FastAPI(title="MediTrack AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(appointments_router)
app.include_router(recommendations_router)
app.include_router(followups_router)
app.include_router(analytics_router)

model_training_metrics: dict | None = None


@app.on_event("startup")
def startup_event():
    init_db()
    seed_database()

    global model_training_metrics
    DATASET_PATH.parent.mkdir(parents=True, exist_ok=True)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    if not DATASET_PATH.exists():
        generate_synthetic_dataset().to_csv(DATASET_PATH, index=False)
    if not MODEL_PATH.exists():
        model_training_metrics = train_and_save_model(dataset_path=DATASET_PATH, model_path=MODEL_PATH)

    ml_service.model_path = MODEL_PATH
    ml_service._load_model()


@app.get("/health")
def health_check():
    return {"status": "ok", "service": "MediTrack AI"}


@app.get("/api/cache/stats")
def cache_stats():
    return cache_service.stats()


@app.get("/api/model/metrics")
def model_metrics():
    if model_training_metrics is None:
        model = ml_service.model
        return {
            "model_path": str(MODEL_PATH),
            "status": "ready",
            "selected_model": getattr(model, "model_name", "unknown"),
            "threshold": getattr(model, "threshold", 0.5),
            "message": "The loaded artifact has no in-memory evaluation report. Run python ml/train_model.py to evaluate and retrain it.",
        }

    metrics = model_training_metrics
    return {
        "model_path": str(MODEL_PATH),
        "status": "trained",
        "selected_model": metrics["selected_model"],
        "threshold": metrics["threshold"],
        "accuracy": metrics["accuracy"],
        "precision": metrics["precision"],
        "recall": metrics["recall"],
        "f1": metrics["f1"],
        "roc_auc": metrics["roc_auc"],
    }

