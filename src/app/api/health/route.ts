import { modelHealth } from "@/lib/lr-c1";

export function GET(): Response {
  return Response.json(modelHealth());
}
