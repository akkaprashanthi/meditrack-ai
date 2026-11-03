from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import ExtraTreesClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

from settings import DATASET_PATH, MODEL_PATH
from services.preprocessing import build_preprocessing_pipeline


def train_and_save_model(dataset_path: Path | str = DATASET_PATH, model_path: Path | str = MODEL_PATH) -> dict:
    dataset_path = Path(dataset_path)
    model_path = Path(model_path)
    dataset = pd.read_csv(dataset_path)
    feature_columns = [
        "previous_no_shows",
        "previous_cancellations",
        "days_since_last_visit",
        "appointment_hour",
        "appointment_day",
        "appointment_type",
        "department",
        "reminder_sent",
        "booking_lead_days",
    ]

    X = dataset[feature_columns]
    y = dataset["no_show"]

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=42,
        stratify=y,
    )
    X_train, X_val, y_train, y_val = train_test_split(
        X_train,
        y_train,
        test_size=0.2,
        random_state=42,
        stratify=y_train,
    )

    model_factories = {
        "Dummy prior": lambda: DummyClassifier(strategy="prior"),
        "Logistic Regression": lambda: LogisticRegression(
            max_iter=2000,
            class_weight="balanced",
            random_state=42,
        ),
        "Random Forest": lambda: RandomForestClassifier(
            n_estimators=200,
            max_depth=None,
            min_samples_leaf=2,
            random_state=42,
            class_weight="balanced",
        ),
        "Extra Trees": lambda: ExtraTreesClassifier(
            n_estimators=300,
            min_samples_leaf=2,
            random_state=42,
            class_weight="balanced",
        ),
    }

    threshold_candidates = np.linspace(0.05, 0.95, 181)
    fitted_models = {}
    validation_results = []
    for model_name, model_factory in model_factories.items():
        pipeline = Pipeline(
            steps=[
                ("preprocessor", build_preprocessing_pipeline()),
                ("model", model_factory()),
            ]
        )
        pipeline.fit(X_train, y_train)
        validation_probabilities = pipeline.predict_proba(X_val)[:, 1]

        best_threshold = 0.5
        best_f1 = -1.0
        for threshold_candidate in threshold_candidates:
            validation_predictions = (validation_probabilities >= threshold_candidate).astype(int)
            score = f1_score(y_val, validation_predictions, zero_division=0)
            if score > best_f1:
                best_f1 = float(score)
                best_threshold = float(threshold_candidate)

        fitted_models[model_name] = {
            "pipeline": pipeline,
            "threshold": best_threshold,
        }
        validation_results.append(
            {
                "model": model_name,
                "validation_threshold": best_threshold,
                "validation_f1": float(best_f1),
                "validation_roc_auc": float(roc_auc_score(y_val, validation_probabilities)),
            }
        )

    selected_result = max(
        validation_results,
        key=lambda result: (result["validation_f1"], result["validation_roc_auc"]),
    )
    selected_model_name = selected_result["model"]
    selected_model = fitted_models[selected_model_name]["pipeline"]
    selected_threshold = fitted_models[selected_model_name]["threshold"]
    selected_model.threshold = float(selected_threshold)
    selected_model.model_name = selected_model_name

    model_comparison = []
    selected_test_metrics = None
    for validation_result in validation_results:
        model_name = validation_result["model"]
        pipeline = fitted_models[model_name]["pipeline"]
        threshold = fitted_models[model_name]["threshold"]
        test_probabilities = pipeline.predict_proba(X_test)[:, 1]
        test_predictions = (test_probabilities >= threshold).astype(int)
        test_metrics = {
            "accuracy": round(float(accuracy_score(y_test, test_predictions)), 4),
            "precision": round(float(precision_score(y_test, test_predictions, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, test_predictions, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, test_predictions, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, test_probabilities)), 4),
            "confusion_matrix": confusion_matrix(y_test, test_predictions).tolist(),
            "positive_class_support": int(y_test.sum()),
            "negative_class_support": int((1 - y_test).sum()),
        }
        model_comparison.append(
            {
                **validation_result,
                "validation_f1": round(validation_result["validation_f1"], 4),
                "validation_roc_auc": round(validation_result["validation_roc_auc"], 4),
                "test_threshold": round(float(threshold), 4),
                "test_metrics": test_metrics,
            }
        )
        if model_name == selected_model_name:
            selected_test_metrics = test_metrics

    metrics = {
        **selected_test_metrics,
        "selected_model": selected_model_name,
        "threshold": round(float(selected_threshold), 4),
        "validation_best_f1": round(float(selected_result["validation_f1"]), 4),
        "default_threshold": 0.5,
        "model_comparison": model_comparison,
        "split_support": {
            "train": len(X_train),
            "validation": len(X_val),
            "test": len(X_test),
        },
        "threshold_selection": {
            "metric": "validation_f1",
            "candidate_min": 0.05,
            "candidate_max": 0.95,
            "candidate_count": len(threshold_candidates),
        },
    }

    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(selected_model, model_path)

    return metrics


if __name__ == "__main__":
    metrics = train_and_save_model()
    print("Model trained and saved.")
    print(metrics)
