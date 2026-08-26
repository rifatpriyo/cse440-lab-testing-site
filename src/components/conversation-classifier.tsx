"use client";

import { useEffect, useRef, useState } from "react";

const CLASS_LABELS: Record<string, string> = {
  charm_flattery: "Charm / Flattery",
  direct_coercion: "Direct Coercion",
  gaslighting: "Gaslighting",
  guilt_tripping: "Guilt Tripping",
  love_bombing: "Love Bombing",
  neutral: "Neutral",
  passive_aggressive: "Passive Aggressive"
};

type Turn = {
  id: number;
  text: string;
};

type PredictionResult = {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
};

const initialTurns: Turn[] = [
  { id: 0, text: "" },
  { id: 1, text: "" }
];

function messageFromResponse(body: unknown, status?: number): string {
  if (body && typeof body === "object") {
    const detail = "detail" in body ? body.detail : undefined;
    if (typeof detail === "string") return detail;
    if (detail && typeof detail === "object" && "message" in detail) {
      return String(detail.message);
    }
  }

  if (status === 404) {
    return "The prediction API is missing from this deployment. Redeploy the project from the repository root.";
  }
  if (status && status >= 500) {
    return "The prediction service could not start. Check the Vercel function logs and redeploy.";
  }

  return "Prediction failed. Please try again.";
}

export function ConversationClassifier() {
  const [turns, setTurns] = useState<Turn[]>(initialTurns);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const nextId = useRef(2);

  useEffect(() => {
    mainRef.current?.setAttribute("data-hydrated", "true");
  }, []);

  function updateTurn(id: number, text: string) {
    setTurns((current) => current.map((turn) => (turn.id === id ? { ...turn, text } : turn)));
    setResult(null);
    setError("");
  }

  function addTurn() {
    setTurns((current) => [...current, { id: nextId.current++, text: "" }]);
    setResult(null);
    setError("");
  }

  function removeTurn(id: number) {
    setTurns((current) => current.filter((turn) => turn.id !== id));
    setResult(null);
    setError("");
  }

  async function analyzeConversation() {
    if (turns.some((turn) => !turn.text.trim())) {
      setError("Please enter text for every conversation turn.");
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: turns.map((turn, index) => ({
            speaker: index % 2 === 0 ? "A" : "B",
            text: turn.text
          }))
        })
      });

      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) throw new Error(messageFromResponse(body, response.status));
      setResult(body as PredictionResult);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Prediction failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const sortedProbabilities = result
    ? Object.entries(result.probabilities).sort(([, left], [, right]) => right - left)
    : [];

  return (
    <main
      ref={mainRef}
      data-hydrated="false"
      className="min-h-screen px-4 py-10 sm:px-6 sm:py-14"
    >
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center sm:mb-10">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-indigo-600">
            CSE440 Machine Learning Project
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Psychological Manipulation
            <span className="block text-indigo-700">Conversation Classifier</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
            Enter a conversation between two people and analyze it using our best trained model.
          </p>
        </header>

        <section
          aria-labelledby="conversation-heading"
          className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8"
        >
          <div className="mb-6">
            <h2 id="conversation-heading" className="text-xl font-semibold text-slate-900">
              Conversation
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Speakers alternate automatically as you add turns.
            </p>
          </div>

          <div className="space-y-5">
            {turns.map((turn, index) => (
              <div key={turn.id}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor={"turn-" + turn.id} className="font-semibold text-slate-800">
                    Person {index % 2 === 0 ? "A" : "B"}
                  </label>
                  {index >= 2 && (
                    <button
                      type="button"
                      onClick={() => removeTurn(turn.id)}
                      disabled={isLoading}
                      className="rounded-lg px-2.5 py-1 text-sm font-medium text-rose-600 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:opacity-50"
                      aria-label={"Remove turn " + (index + 1)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  id={"turn-" + turn.id}
                  value={turn.text}
                  onChange={(event) => updateTurn(turn.id, event.target.value)}
                  disabled={isLoading}
                  maxLength={1000}
                  rows={3}
                  placeholder="Type conversation..."
                  className="w-full resize-y rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-base leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-70"
                />
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addTurn}
            disabled={isLoading || turns.length >= 12}
            className="mt-5 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Add Turn
          </button>

          {error && (
            <div role="alert" className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={analyzeConversation}
            disabled={isLoading}
            className="mt-7 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-700 px-5 py-3.5 font-semibold text-white shadow-sm transition hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:bg-indigo-400"
          >
            {isLoading && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {isLoading ? "Analyzing..." : "Analyze Conversation"}
          </button>
        </section>

        {result && (
          <section
            aria-live="polite"
            className="mt-7 rounded-3xl border border-indigo-100 bg-white p-5 shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:p-8"
          >
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-indigo-600">
              Prediction
            </p>
            <div className="mt-3 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-3xl font-bold text-slate-950 sm:text-4xl">
                {CLASS_LABELS[result.prediction] ?? result.prediction}
              </h2>
              <div className="sm:text-right">
                <p className="text-sm text-slate-500">Model Confidence</p>
                <p className="text-2xl font-bold text-indigo-700">
                  {(result.confidence * 100).toFixed(1)}%
                </p>
              </div>
            </div>

            <details className="group mt-7 border-t border-slate-200 pt-5">
              <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg font-semibold text-slate-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-500">
                View Details
                <span aria-hidden="true" className="text-slate-500 transition group-open:rotate-180">
                  ▾
                </span>
              </summary>
              <div className="mt-5 space-y-4">
                {sortedProbabilities.map(([className, probability]) => (
                  <div key={className}>
                    <div className="mb-1.5 flex justify-between gap-4 text-sm">
                      <span className="font-medium text-slate-700">
                        {CLASS_LABELS[className] ?? className}
                      </span>
                      <span className="tabular-nums text-slate-500">
                        {(probability * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={CLASS_LABELS[className] ?? className}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={Math.round(probability * 100)}
                      className="h-2.5 overflow-hidden rounded-full bg-slate-100"
                    >
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-[width]"
                        style={{ width: Math.max(0, Math.min(100, probability * 100)) + "%" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </details>
          </section>
        )}

        <section className="mt-7 grid grid-cols-3 divide-x divide-slate-200 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm sm:p-5">
          <div className="px-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Model</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 sm:text-base">
              LR_C1
            </p>
          </div>
          <div className="px-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Representation</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 sm:text-base">TF-IDF</p>
          </div>
          <div className="px-2">
            <p className="text-xs uppercase tracking-wide text-slate-500">Classes</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 sm:text-base">7</p>
          </div>
        </section>

        <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-slate-500 sm:text-sm">
          This classifier is an academic machine-learning project trained on synthetic
          conversation data. Predictions and confidence scores should not be considered
          professional psychological assessments.
        </p>
      </div>
    </main>
  );
}
