"""
Train disease prediction model from Ayurveda healthcare CSV.
Preprocessing: missing values, categorical encoding, text vectorization.
Saves RandomForestClassifier + encoders + vectorizer via pickle.
"""
from __future__ import annotations

import json
import pickle
from pathlib import Path

import numpy as np
import pandas as pd
from scipy.sparse import issparse
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
# Alternatives (same preprocessing pipeline): DecisionTreeClassifier(max_depth=10, random_state=42)
# For sparse text-only features, try MultinomialNB() after a CountVectorizer-only pipeline.
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.impute import SimpleImputer
from sklearn.metrics import accuracy_score, classification_report
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import FunctionTransformer, OneHotEncoder, StandardScaler

DATA_DIR = Path(__file__).resolve().parent / "data"
MODEL_PATH = Path(__file__).resolve().parent / "artifacts" / "model_bundle.pkl"


def _to_dense(X):
    """RandomForest requires dense input; ColumnTransformer may output sparse."""
    if issparse(X):
        return X.toarray()
    return X


def load_dataset(csv_path: Path) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    # Normalize column names
    df.columns = [c.strip().lower() for c in df.columns]
    required = {"symptoms", "disease", "dosha", "remedy", "yoga"}
    missing_cols = required - set(df.columns)
    if missing_cols:
        raise ValueError(f"CSV missing columns: {missing_cols}")

    # Optional age bounds: if missing, fill with defaults for pipeline
    if "age_min" not in df.columns:
        df["age_min"] = np.nan
    if "age_max" not in df.columns:
        df["age_max"] = np.nan

    # Handle missing values in text/categorical
    for col in ["symptoms", "disease", "dosha", "remedy", "yoga"]:
        df[col] = df[col].fillna("unknown").astype(str).str.strip()

    for col in ["age_min", "age_max"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df


def build_lookup(df: pd.DataFrame) -> dict[str, dict[str, str]]:
    """Map predicted disease -> typical remedy, yoga, dosha from training data."""
    lookup: dict[str, dict[str, str]] = {}
    for disease, g in df.groupby("disease"):
        mode_row = g.iloc[0]
        lookup[disease] = {
            "remedy": str(mode_row["remedy"]),
            "yoga": str(mode_row["yoga"]),
            "dosha": str(mode_row["dosha"]),
        }
    return lookup


def main() -> None:
    csv_path = DATA_DIR / "dataset.csv"
    if not csv_path.exists():
        raise FileNotFoundError(f"Place dataset at {csv_path}")

    df = load_dataset(csv_path)
    lookup = build_lookup(df)

    X = df[["symptoms", "dosha", "age_min", "age_max"]].copy()
    y = df["disease"]

    # Numeric: impute missing age bounds with median then scale
    numeric_features = ["age_min", "age_max"]
    numeric_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )

    # Dosha one-hot
    categorical_features = ["dosha"]
    categorical_transformer = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("onehot", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
        ]
    )

    # Symptoms: TF-IDF
    text_transformer = TfidfVectorizer(
        lowercase=True,
        max_features=256,
        ngram_range=(1, 2),
    )

    preprocessor = ColumnTransformer(
        transformers=[
            ("num", numeric_transformer, numeric_features),
            ("cat", categorical_transformer, categorical_features),
            ("txt", text_transformer, "symptoms"),
        ]
    )

    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=12,
        random_state=42,
        class_weight="balanced",
    )

    pipeline = Pipeline(
        steps=[
            ("prep", preprocessor),
            ("dense", FunctionTransformer(_to_dense)),
            ("model", clf),
        ]
    )

    # Stratify only when each class has >=2 samples AND test split can hold every class
    vc = y.value_counts()
    test_size = 0.25
    strat = (
        y
        if vc.min() >= 2 and len(y) * test_size >= y.nunique()
        else None
    )
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=42, stratify=strat
    )

    pipeline.fit(X_train, y_train)
    y_pred = pipeline.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"Test accuracy: {acc:.4f}")
    print(classification_report(y_test, y_pred, zero_division=0))

    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    bundle = {
        "pipeline": pipeline,
        "lookup": lookup,
        "meta": {
            "accuracy": float(acc),
            "n_samples": int(len(df)),
            "labels": sorted(y.unique().tolist()),
        },
    }
    with open(MODEL_PATH, "wb") as f:
        pickle.dump(bundle, f)

    with open(MODEL_PATH.parent / "training_meta.json", "w", encoding="utf-8") as f:
        json.dump(bundle["meta"], f, indent=2)

    print(f"Saved bundle to {MODEL_PATH}")


if __name__ == "__main__":
    main()
