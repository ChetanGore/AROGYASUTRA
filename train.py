"""
AryogaSutra — ML Training Pipeline
Trains a Random Forest classifier on the Ayurvedic dataset and serializes
model.pkl and encoder.pkl for use by the Flask inference service.

Usage:
    python train.py
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import OneHotEncoder, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score

# ── Paths ──────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(BASE_DIR, "dataset.csv")
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.pkl")


def load_data(path: str) -> pd.DataFrame:
    """Load dataset and drop rows where the target column is null."""
    df = pd.read_csv(path)
    before = len(df)
    df = df.dropna(subset=["disease"])
    after = len(df)
    if before != after:
        print(f"[train] Dropped {before - after} rows with null disease.")
    print(f"[train] Loaded {after} rows from {path}")
    return df


def build_features(df: pd.DataFrame):
    """
    Apply OneHotEncoding to categorical input features [symptoms, dosha].
    Returns the transformed feature matrix and the fitted encoder.
    """
    feature_cols = ["symptoms", "dosha"]
    encoder = OneHotEncoder(handle_unknown="ignore", sparse_output=False)
    X = encoder.fit_transform(df[feature_cols])
    return X, encoder


def build_target(df: pd.DataFrame):
    """
    Apply LabelEncoding to the disease target column.
    Returns encoded labels and the fitted LabelEncoder.
    """
    le = LabelEncoder()
    y = le.fit_transform(df["disease"])
    return y, le


def build_maps(df: pd.DataFrame, le: LabelEncoder) -> tuple[dict, dict]:
    """
    Build reverse-lookup maps: disease_name → remedy and disease_name → yoga.
    """
    remedy_map: dict[str, str] = {}
    yoga_map: dict[str, str] = {}
    for _, row in df.iterrows():
        disease = str(row["disease"])
        remedy_map[disease] = str(row.get("remedy", ""))
        yoga_map[disease] = str(row.get("yoga", ""))
    return remedy_map, yoga_map


def train(df: pd.DataFrame):
    """Full training pipeline. Returns (model, encoder_bundle)."""
    X, ohe = build_features(df)
    y, le = build_target(df)
    remedy_map, yoga_map = build_maps(df, le)

    # Disable stratify when any class has fewer than 2 samples (e.g. small datasets)
    unique, counts = np.unique(y, return_counts=True)
    can_stratify = len(unique) > 1 and np.min(counts) >= 2
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y if can_stratify else None
    )

    clf = RandomForestClassifier(
        n_estimators=100,
        random_state=42,
        class_weight="balanced",
    )
    clf.fit(X_train, y_train)

    train_acc = accuracy_score(y_train, clf.predict(X_train))
    test_acc = accuracy_score(y_test, clf.predict(X_test))
    print(f"[train] Train accuracy: {train_acc:.4f}  |  Test accuracy: {test_acc:.4f}")

    encoder_bundle = {
        "encoder": ohe,
        "label_encoder": le,
        "remedy_map": remedy_map,
        "yoga_map": yoga_map,
    }
    return clf, encoder_bundle


def save_artifacts(clf, encoder_bundle: dict) -> None:
    """Serialize model and encoder bundle to disk using joblib."""
    joblib.dump(clf, MODEL_PATH)
    joblib.dump(encoder_bundle, ENCODER_PATH)
    print(f"[train] Saved model  → {MODEL_PATH}")
    print(f"[train] Saved encoder → {ENCODER_PATH}")


def main() -> None:
    if not os.path.exists(DATASET_PATH):
        print(f"[train] ERROR: dataset not found at {DATASET_PATH}", file=sys.stderr)
        sys.exit(1)

    df = load_data(DATASET_PATH)
    clf, encoder_bundle = train(df)
    save_artifacts(clf, encoder_bundle)
    print("[train] Done.")


if __name__ == "__main__":
    main()
