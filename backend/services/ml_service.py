from __future__ import annotations

import joblib
import pandas as pd

from settings import MODEL_PATH
from services.preprocessing import prepare_features_for_model


class MLService:
    def __init__(self, model_path=MODEL_PATH):
        self.model_path = model_path
        self.model = None

    def _load_model(self):
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model artifact not found at {self.model_path}")
        self.model = joblib.load(self.model_path)

    def predict(self, features: dict | pd.DataFrame) -> dict:
        if self.model is None:
            self._load_model()

        prepared = prepare_features_for_model(features)
        probability = self.model.predict_proba(prepared)[0][1]
        threshold = getattr(self.model, "threshold", 0.5)
        prediction = int(probability >= threshold)

        return {
            "prediction": prediction,
            "probability": float(probability),
            "threshold": float(threshold),
        }

    def predict_probability(self, features: dict | pd.DataFrame) -> float:
        prediction = self.predict(features)
        return float(prediction["probability"])


ml_service = MLService()
