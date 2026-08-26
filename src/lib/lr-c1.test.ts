import { describe, expect, it } from "vitest";

import { predictConversation } from "./lr-c1";

describe("LR_C1 exported model", () => {
  it("matches the joblib prediction for the reported Vercel example", () => {
    const result = predictConversation(
      "[SPEAKER_A] You're honestly the smartest person in this entire team. " +
        "[TURN] [SPEAKER_B] Thanks. " +
        "[TURN] [SPEAKER_A] That's why I know you're the perfect person to finish my part of the assignment too."
    );

    expect(result.prediction).toBe("charm_flattery");
    expect(result.confidence).toBeCloseTo(0.8141074654598319, 6);
    expect(result.probabilities.neutral).toBeCloseTo(0.05506117777815803, 6);
  });

  it("matches the joblib output for a neutral conversation", () => {
    const result = predictConversation("[SPEAKER_A] Hello [TURN] [SPEAKER_B] Hi");

    expect(result.prediction).toBe("neutral");
    expect(result.confidence).toBeCloseTo(0.3525855775343253, 6);
    expect(Object.values(result.probabilities).reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      1,
      12
    );
  });

  it("matches the joblib output for a guilt-tripping conversation", () => {
    const result = predictConversation(
      "[SPEAKER_A] Remember when I helped you? [TURN] [SPEAKER_B] Yes. " +
        "[TURN] [SPEAKER_A] Then you should do this for me."
    );

    expect(result.prediction).toBe("guilt_tripping");
    expect(result.confidence).toBeCloseTo(0.2928729815032479, 6);
  });
});
