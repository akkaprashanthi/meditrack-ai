from __future__ import annotations

import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent
DEFAULT_ARTIFACT_DIR = BACKEND_DIR / "ml" / "artifacts"


def backend_path(environment_name: str, default_path: Path) -> Path:
    configured_path = Path(os.getenv(environment_name, str(default_path)))
    if not configured_path.is_absolute():
        configured_path = BACKEND_DIR / configured_path
    return configured_path.resolve()


ARTIFACT_DIR = backend_path("MODEL_ARTIFACT_DIR", DEFAULT_ARTIFACT_DIR)
DATASET_PATH = backend_path("SYNTHETIC_DATASET_PATH", ARTIFACT_DIR / "synthetic_dataset.csv")
MODEL_PATH = backend_path("MODEL_ARTIFACT_PATH", ARTIFACT_DIR / "no_show_model.joblib")
CORS_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
APP_PORT = int(os.getenv("APP_PORT", os.getenv("PORT", "8000")))