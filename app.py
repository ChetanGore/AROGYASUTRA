"""
AryogaSutra — ML / Chatbot Flask Service  (port 5000)

Endpoints:
  POST /predict   — disease prediction via Random Forest
  POST /chat      — context-aware Ayurvedic chatbot
  GET  /health    — liveness probe

CORS is configured to allow requests from http://localhost:8080 (Spring Boot backend).
"""

import os
import sys
import logging

import joblib
import numpy as np
import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

from chatbot import get_reply

# ── Logging ────────────────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
log = logging.getLogger("aryogasutra-ml")

# ── Configuration ──────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoder.pkl")
BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8080")
INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "")

# ── Load artifacts at startup ──────────────────────────────────────────────────
def _load_artifacts():
    if not os.path.exists(MODEL_PATH):
        raise RuntimeError(
            f"model.pkl not found at {MODEL_PATH}. "
            "Run 'python train.py' first to generate the model."
        )
    if not os.path.exists(ENCODER_PATH):
        raise RuntimeError(
            f"encoder.pkl not found at {ENCODER_PATH}. "
            "Run 'python train.py' first to generate the encoder."
        )
    model = joblib.load(MODEL_PATH)
    bundle = joblib.load(ENCODER_PATH)
    log.info("Loaded model and encoder from disk.")
    return model, bundle


try:
    MODEL, ENCODER_BUNDLE = _load_artifacts()
    OHE = ENCODER_BUNDLE["encoder"]
    LE = ENCODER_BUNDLE["label_encoder"]
    REMEDY_MAP: dict = ENCODER_BUNDLE["remedy_map"]
    YOGA_MAP: dict = ENCODER_BUNDLE["yoga_map"]
    ARTIFACTS_LOADED = True
except RuntimeError as _e:
    log.warning("Artifacts not loaded: %s", _e)
    MODEL = OHE = LE = REMEDY_MAP = YOGA_MAP = None
    ARTIFACTS_LOADED = False

# ── Flask app ──────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app, origins=["http://localhost:8080", "http://127.0.0.1:8080"])


# ── Helper ─────────────────────────────────────────────────────────────────────
def _error(message: str, status: int):
    return jsonify({"error": message, "status": status}), status


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    """Liveness probe — always returns 200."""
    return jsonify({"status": "UP"})


@app.post("/predict")
def predict():
    """
    Predict disease from symptoms, age, and dosha.

    Request body:
        { "symptoms": str, "age": int, "dosha": str }

    Response:
        { "disease": str, "remedy": str, "yoga": str, "confidence": float }
    """
    if not ARTIFACTS_LOADED:
        return _error(
            "ML model not loaded. Run 'python train.py' to generate model.pkl and encoder.pkl.",
            503,
        )

    data = request.get_json(silent=True) or {}

    symptoms: str = str(data.get("symptoms", "")).strip()
    dosha: str = str(data.get("dosha", "")).strip()
    age = data.get("age")

    # Validation
    if not symptoms:
        return _error("symptoms field is required and must not be empty.", 400)
    if age is None:
        return _error("age field is required.", 400)
    try:
        age = int(age)
    except (TypeError, ValueError):
        return _error("age must be an integer.", 400)
    if not dosha:
        dosha = "Vata"  # sensible default

    # Preprocess — same pipeline as training
    try:
        X = OHE.transform([[symptoms, dosha]])
    except Exception as exc:
        log.warning("Encoding error: %s", exc)
        # Fall back to zeros for unknown categories (handle_unknown='ignore' already does this)
        X = OHE.transform([["unknown", "Vata"]])

    # Inference
    proba = MODEL.predict_proba(X)[0]
    top_idx = int(np.argmax(proba))
    confidence = float(proba[top_idx])

    disease_name: str = LE.inverse_transform([top_idx])[0]
    remedy: str = REMEDY_MAP.get(disease_name, "Consult an Ayurvedic practitioner.")
    yoga: str = YOGA_MAP.get(disease_name, "Gentle yoga and pranayama.")

    return jsonify(
        {
            "disease": disease_name,
            "remedy": remedy,
            "yoga": yoga,
            "confidence": round(confidence, 4),
        }
    )


@app.post("/chat")
def chat():
    """
    Context-aware Ayurvedic chatbot.

    Request body:
        { "message": str, "patientId": int }

    Response:
        { "reply": str }
    """
    data = request.get_json(silent=True) or {}

    message: str = str(data.get("message", "")).strip()
    patient_id = data.get("patientId")

    if not message:
        return _error("message field is required and must not be empty.", 400)
    if patient_id is None:
        return _error("patientId field is required.", 400)

    # Fetch patient context from the Spring Boot backend
    patient_data: dict = {}
    try:
        headers = {}
        if INTERNAL_TOKEN:
            headers["Authorization"] = f"Bearer {INTERNAL_TOKEN}"
        resp = requests.get(
            f"{BACKEND_URL}/patients/{patient_id}",
            headers=headers,
            timeout=5,
        )
        if resp.status_code == 404:
            return _error(f"Patient with id {patient_id} not found.", 404)
        if resp.ok:
            patient_data = resp.json()
    except requests.RequestException as exc:
        log.warning("Could not reach backend for patient context: %s", exc)
        # Proceed with empty context — chatbot will use generic templates

    reply = get_reply(message, patient_data)
    return jsonify({"reply": reply})


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    log.info("Starting AryogaSutra ML service on port %d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
