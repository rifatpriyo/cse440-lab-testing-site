import exportedModel from "../../model/LR_C1.json";

type ExportedModel = {
  format: string;
  classes: string[];
  features: string[];
  idf: number[];
  coefficients: number[][];
  intercept: number[];
};

export type PredictionResult = {
  prediction: string;
  confidence: number;
  probabilities: Record<string, number>;
};

const model = exportedModel as ExportedModel;
const featureIndex = new Map(model.features.map((feature, index) => [feature, index]));
const wordPattern = /[\p{L}\p{N}_]{2,}/gu;

function validateModel(): void {
  const featureCount = model.features.length;
  const classCount = model.classes.length;

  if (
    model.format !== "tfidf_logistic_regression_v1" ||
    classCount !== 7 ||
    model.idf.length !== featureCount ||
    model.coefficients.length !== classCount ||
    model.coefficients.some((row) => row.length !== featureCount) ||
    model.intercept.length !== classCount
  ) {
    throw new Error("LR_C1 model export has an invalid shape.");
  }
}

validateModel();

function vectorize(text: string): Map<number, number> {
  const tokens = text.toLowerCase().match(wordPattern) ?? [];
  const counts = new Map<number, number>();

  function addFeature(feature: string): void {
    const index = featureIndex.get(feature);
    if (index !== undefined) counts.set(index, (counts.get(index) ?? 0) + 1);
  }

  for (let index = 0; index < tokens.length; index += 1) {
    addFeature(tokens[index]);
    if (index + 1 < tokens.length) addFeature(`${tokens[index]} ${tokens[index + 1]}`);
  }

  const weighted = new Map<number, number>();
  let squaredNorm = 0;

  for (const [index, count] of counts) {
    const value = (1 + Math.log(count)) * model.idf[index];
    weighted.set(index, value);
    squaredNorm += value * value;
  }

  const norm = Math.sqrt(squaredNorm);
  if (norm > 0) {
    for (const [index, value] of weighted) weighted.set(index, value / norm);
  }

  return weighted;
}

export function predictConversation(conversation: string): PredictionResult {
  const vector = vectorize(conversation);
  const scores = model.classes.map((_, classIndex) => {
    let score = model.intercept[classIndex];
    for (const [feature, value] of vector) {
      score += model.coefficients[classIndex][feature] * value;
    }
    return score;
  });

  const largestScore = Math.max(...scores);
  const exponentials = scores.map((score) => Math.exp(score - largestScore));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  const values = exponentials.map((value) => value / total);
  const bestIndex = values.reduce(
    (best, value, index) => (value > values[best] ? index : best),
    0
  );
  const probabilities = Object.fromEntries(
    model.classes.map((className, index) => [className, values[index]])
  );

  return {
    prediction: model.classes[bestIndex],
    confidence: values[bestIndex],
    probabilities
  };
}

export function modelHealth(): { status: "ok"; model_present: true } {
  return { status: "ok", model_present: true };
}
