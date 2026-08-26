from __future__ import annotations

import re
import threading
from pathlib import Path
from typing import Any, Literal

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

CLASS_LABELS = (
    "charm_flattery",
    "direct_coercion",
    "gaslighting",
    "guilt_tripping",
    "love_bombing",
    "neutral",
    "passive_aggressive",
)
RESERVED_MARKERS = ("[SPEAKER_A]", "[SPEAKER_B]", "[TURN]")
MODEL_PATH = Path(__file__).resolve().parents[1] / "model" / "LR_C1.joblib"

_model: Any | None = None
_model_lock = threading.Lock()

app = FastAPI(title="CSE440 Conversation Classifier")


class Turn(BaseModel):
    speaker: Literal["A", "B"]
    text: str = Field(max_length=1000)


class PredictRequest(BaseModel):
    turns: list[Turn] = Field(min_length=2, max_length=12)


class PredictResponse(BaseModel):
    prediction: str
    confidence: float
    probabilities: dict[str, float]


def basic_text_fix(text: object) -> str:
    cleaned = str(text).replace("\u00a0", " ").replace("\ufffd", "")
    return re.sub(r"\s+", " ", cleaned).strip()


def serialize_turns(turns: list[Turn]) -> str:
    serialized: list[str] = []
    for turn in turns:
        text = basic_text_fix(turn.text)
        if not text:
            raise ValueError("Every conversation turn must contain text.")
        if any(marker in text.upper() for marker in RESERVED_MARKERS):
            raise ValueError("Speaker and turn markers are added automatically.")
        serialized.append(f"[SPEAKER_{turn.speaker}] {text}")
    return " [TURN] ".join(serialized)


def get_model() -> Any:
    global _model

    if _model is not None:
        return _model

    with _model_lock:
        if _model is not None:
            return _model
        if not MODEL_PATH.is_file():
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "MODEL_MISSING",
                    "message": "Model missing. Place LR_C1.joblib inside the web/model folder.",
                },
            )
        try:
            _model = joblib.load(MODEL_PATH)
        except Exception:
            raise HTTPException(
                status_code=503,
                detail={
                    "code": "MODEL_LOAD_ERROR",
                    "message": "The LR_C1 model could not be loaded. Check the model file and Python package versions.",
                },
            ) from None
        return _model


def run_prediction(model: Any, conversation: str) -> PredictResponse:
    try:
        classes = [str(label) for label in model.classes_]
        raw_probabilities = np.asarray(model.predict_proba([conversation])[0], dtype=float)
        prediction = str(model.predict([conversation])[0])
    except Exception:
        raise HTTPException(
            status_code=500,
            detail={
                "code": "PREDICTION_ERROR",
                "message": "The model could not analyze this conversation.",
            },
        ) from None

    if (
        len(classes) != len(CLASS_LABELS)
        or set(classes) != set(CLASS_LABELS)
        or raw_probabilities.shape != (len(classes),)
        or not np.isfinite(raw_probabilities).all()
        or prediction not in classes
    ):
        raise HTTPException(
            status_code=500,
            detail={
                "code": "MODEL_OUTPUT_ERROR",
                "message": "The model output does not match the expected seven classes.",
            },
        )

    by_model_class = {
        class_name: float(probability)
        for class_name, probability in zip(classes, raw_probabilities, strict=True)
    }
    probabilities = {class_name: by_model_class[class_name] for class_name in CLASS_LABELS}

    return PredictResponse(
        prediction=prediction,
        confidence=probabilities[prediction],
        probabilities=probabilities,
    )


@app.post("/api/predict", response_model=PredictResponse)
def predict(request: PredictRequest) -> PredictResponse:
    try:
        conversation = serialize_turns(request.turns)
    except ValueError as error:
        raise HTTPException(
            status_code=422,
            detail={"code": "INVALID_CONVERSATION", "message": str(error)},
        ) from None

    return run_prediction(get_model(), conversation)
