# Psychological Manipulation Conversation Classifier

A simple CSE440 project website that classifies a two-person conversation using the selected `LR_C1` model.

## Technology

- Next.js, TypeScript, and Tailwind CSS
- Next.js prediction endpoint at `src/app/api/predict/route.ts`
- Fitted `LR_C1` TF-IDF parameters exported from `model/LR_C1.joblib`

The application does not retrain the model, create accounts, use a database, or save conversations.

## Run locally

Install Node.js 20.9 or newer, then run:

```powershell
npm install
npm run dev
```

Open `http://localhost:3000`.

Python is only needed if `LR_C1.joblib` changes. Re-export its fitted parameters with:

```powershell
python scripts/export_lr_c1.py
```

## Prediction flow

The website sends the ordered Person A and Person B turns to `POST /api/predict`. The API converts them to the training format:

```text
[SPEAKER_A] Hello [TURN] [SPEAKER_B] Hi
```

The endpoint applies the fitted model's exported vocabulary, IDF values, coefficients, and intercepts to return the prediction and all seven probabilities. It does not retrain the model.

## Deploy on Vercel

1. Import this GitHub repository into Vercel.
2. Keep the repository root as the project root.
3. Accept the detected Next.js settings.
4. Deploy.

The site and its prediction endpoint deploy together as one Next.js project; no separate backend or environment variables are required.

> This classifier is an academic machine-learning project trained on synthetic conversation data. Predictions are not professional psychological assessments.
