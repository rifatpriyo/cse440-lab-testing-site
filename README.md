# Psychological Manipulation Conversation Classifier

A simple CSE440 project website that classifies a two-person conversation using the selected `LR_C1` model.

## Technology

- Next.js, TypeScript, and Tailwind CSS
- FastAPI serverless endpoint at `api/index.py`
- Fitted Logistic Regression and TF-IDF pipeline at `model/LR_C1.joblib`

The application does not retrain the model, create accounts, use a database, or save conversations.

## Run locally

Install Node.js 20.9 or newer and Python 3.12, then run:

```powershell
npm install
python -m pip install -r requirements-dev.txt
npm install --global vercel
vercel dev
```

Open `http://localhost:3000`.

Without the Vercel CLI, use two terminals:

```powershell
# Terminal 1
npm run dev:api

# Terminal 2
$env:LOCAL_API_URL="http://127.0.0.1:8000"
npm run dev
```

## Prediction flow

The website sends the ordered Person A and Person B turns to `POST /api/predict`. The API converts them to the training format:

```text
[SPEAKER_A] Hello [TURN] [SPEAKER_B] Hi
```

It loads the fitted model, calls `predict()` and `predict_proba()`, and uses `model.classes_` to return the prediction and all seven probabilities.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. Keep the repository root as the project root.
3. Accept the detected Next.js settings.
4. Deploy.

The Next.js site, Python API, and model are all included in this one repository.

> This classifier is an academic machine-learning project trained on synthetic conversation data. Predictions are not professional psychological assessments.
