import { predictConversation } from "@/lib/lr-c1";

type Turn = {
  speaker: "A" | "B";
  text: string;
};

const reservedMarkers = ["[SPEAKER_A]", "[SPEAKER_B]", "[TURN]"];

function errorResponse(code: string, message: string, status: number): Response {
  return Response.json({ detail: { code, message } }, { status });
}

function parseTurns(body: unknown): Turn[] | null {
  if (!body || typeof body !== "object" || !("turns" in body) || !Array.isArray(body.turns)) {
    return null;
  }

  if (body.turns.length < 2 || body.turns.length > 12) return null;

  const turns: Turn[] = [];
  for (const value of body.turns) {
    if (
      !value ||
      typeof value !== "object" ||
      !("speaker" in value) ||
      (value.speaker !== "A" && value.speaker !== "B") ||
      !("text" in value) ||
      typeof value.text !== "string" ||
      value.text.length > 1000
    ) {
      return null;
    }
    turns.push({ speaker: value.speaker, text: value.text });
  }

  return turns;
}

function serializeTurns(turns: Turn[]): string {
  return turns
    .map((turn) => {
      const text = turn.text
        .replaceAll("\u00a0", " ")
        .replaceAll("\ufffd", "")
        .replace(/\s+/gu, " ")
        .trim();

      if (!text) throw new Error("Every conversation turn must contain text.");
      if (reservedMarkers.some((marker) => text.toUpperCase().includes(marker))) {
        throw new Error("Speaker and turn markers are added automatically.");
      }
      return `[SPEAKER_${turn.speaker}] ${text}`;
    })
    .join(" [TURN] ");
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "The request must contain valid JSON.", 400);
  }

  const turns = parseTurns(body);
  if (!turns) {
    return errorResponse(
      "INVALID_REQUEST",
      "Enter between 2 and 12 valid conversation turns.",
      422
    );
  }

  try {
    return Response.json(predictConversation(serializeTurns(turns)));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "The model could not analyze this conversation.";
    return errorResponse("INVALID_CONVERSATION", message, 422);
  }
}
