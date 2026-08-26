from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import joblib


ROOT = Path(__file__).resolve().parents[1]
SOURCE_PATH = ROOT / "model" / "LR_C1.joblib"
OUTPUT_PATH = ROOT / "model" / "LR_C1.json"


def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)


def export_model() -> None:
    pipeline: Any = joblib.load(SOURCE_PATH)
    vectorizer = pipeline.named_steps["tfidf"]
    classifier = pipeline.named_steps["model"]

    require(vectorizer.analyzer == "word", "Expected a word TF-IDF analyzer.")
    require(vectorizer.lowercase is True, "Expected lowercase text.")
    require(vectorizer.ngram_range == (1, 2), "Expected unigrams and bigrams.")
    require(vectorizer.norm == "l2", "Expected L2 normalization.")
    require(vectorizer.sublinear_tf is True, "Expected sublinear term frequency.")
    require(vectorizer.stop_words is None, "Custom stop words are not supported.")
    require(vectorizer.strip_accents is None, "Accent stripping is not supported.")
    require(vectorizer.preprocessor is None, "Custom preprocessing is not supported.")
    require(vectorizer.tokenizer is None, "Custom tokenization is not supported.")
    require(
        vectorizer.token_pattern == r"(?u)\b\w\w+\b",
        "Expected the default word token pattern.",
    )

    features = [""] * len(vectorizer.vocabulary_)
    for token, index in vectorizer.vocabulary_.items():
        features[index] = token

    payload = {
        "format": "tfidf_logistic_regression_v1",
        "classes": [str(value) for value in classifier.classes_],
        "features": features,
        "idf": vectorizer.idf_.tolist(),
        "coefficients": classifier.coef_.tolist(),
        "intercept": classifier.intercept_.tolist(),
    }

    OUTPUT_PATH.write_text(
        json.dumps(payload, separators=(",", ":")),
        encoding="utf-8",
    )
    print(f"Exported {len(features)} TF-IDF features to {OUTPUT_PATH}")


if __name__ == "__main__":
    export_model()
