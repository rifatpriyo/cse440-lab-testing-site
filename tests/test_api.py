from __future__ import annotations

import numpy as np
import pytest
from fastapi.testclient import TestClient

from api import index


class OrderedModelStub:
    classes_ = np.array(
        [
            "neutral",
            "charm_flattery",
            "gaslighting",
            "direct_coercion",
            "guilt_tripping",
            "passive_aggressive",
            "love_bombing",
        ]
    )

    def __init__(self) -> None:
        self.conversation = ""

    def predict_proba(self, conversations: list[str]) -> np.ndarray:
        self.conversation = conversations[0]
        return np.array([[0.60, 0.04, 0.10, 0.07, 0.08, 0.05, 0.06]])

    def predict(self, conversations: list[str]) -> np.ndarray:
        assert conversations[0] == self.conversation
        return np.array(["neutral"])


def test_basic_text_fix_and_exact_turn_serialization() -> None:
    turns = [
        index.Turn(speaker="A", text="  Hello\u00a0 there\n"),
        index.Turn(speaker="B", text="Hi\ufffd   friend"),
    ]

    assert index.serialize_turns(turns) == (
        "[SPEAKER_A] Hello there [TURN] [SPEAKER_B] Hi friend"
    )


def test_health_reports_model_availability() -> None:
    response = TestClient(index.app).get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "model_present": index.MODEL_PATH.is_file(),
    }


def test_predict_maps_probabilities_using_model_classes(monkeypatch: pytest.MonkeyPatch) -> None:
    model = OrderedModelStub()
    monkeypatch.setattr(index, "get_model", lambda: model)
    client = TestClient(index.app)

    response = client.post(
        "/api/predict",
        json={
            "turns": [
                {"speaker": "A", "text": "Hello"},
                {"speaker": "B", "text": "Hi"},
            ]
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert model.conversation == "[SPEAKER_A] Hello [TURN] [SPEAKER_B] Hi"
    assert result["prediction"] == "neutral"
    assert result["confidence"] == pytest.approx(0.60)
    assert result["probabilities"]["direct_coercion"] == pytest.approx(0.07)
    assert list(result["probabilities"]) == list(index.CLASS_LABELS)


def test_missing_model_returns_a_clear_error(
    monkeypatch: pytest.MonkeyPatch, tmp_path
) -> None:
    monkeypatch.setattr(index, "_model", None)
    monkeypatch.setattr(index, "MODEL_PATH", tmp_path / "LR_C1.joblib")
    client = TestClient(index.app)

    response = client.post(
        "/api/predict",
        json={
            "turns": [
                {"speaker": "A", "text": "Hello"},
                {"speaker": "B", "text": "Hi"},
            ]
        },
    )

    assert response.status_code == 503
    assert response.json()["detail"]["code"] == "MODEL_MISSING"


@pytest.mark.skipif(
    not index.MODEL_PATH.is_file(),
    reason="Real LR_C1.joblib has not been added to web/model.",
)
def test_real_lr_c1_model_loads_and_predicts_all_seven_classes(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(index, "_model", None)
    client = TestClient(index.app)
    response = client.post(
        "/api/predict",
        json={
            "turns": [
                {"speaker": "A", "text": "Remember when I helped you?"},
                {"speaker": "B", "text": "Yes."},
                {"speaker": "A", "text": "Then you should do this for me."},
            ]
        },
    )

    assert response.status_code == 200
    result = response.json()
    assert result["prediction"] in index.CLASS_LABELS
    assert set(result["probabilities"]) == set(index.CLASS_LABELS)
    assert result["confidence"] == pytest.approx(
        result["probabilities"][result["prediction"]]
    )
    assert sum(result["probabilities"].values()) == pytest.approx(1.0)
