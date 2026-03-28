import { z } from "zod";

export const triageSchema = z.object({
  userProvidedSummary: z.string().optional().default(""),
  visualObservations: z.string(),
  inferredConcerns: z.string(),
  urgency: z.enum(["CRITICAL", "URGENT", "STABLE", "UNKNOWN"]),
  recommendedActions: z.array(z.string()).min(1),
  handoffSummary: z.string(),
  disclaimer: z.string()
});

export type TriageModelResponse = z.infer<typeof triageSchema>;

export function validateTriageResponse(data: unknown): TriageModelResponse {
  const result = triageSchema.safeParse(data);
  if (!result.success) {
    console.error("Schema validation failed:", result.error);
    throw new Error("Invalid model response schema");
  }
  return result.data;
}
