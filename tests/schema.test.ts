import { describe, it, expect } from 'vitest';
import { triageSchema, validateTriageResponse } from '../lib/schema';

describe('Schema: triageSchema', () => {
  it('should validate a valid model response', () => {
    const validData = {
      userProvidedSummary: "Patient with moderate bleeding.",
      visualObservations: "Blood on left leg.",
      inferredConcerns: "Possible deep laceration.",
      urgency: "URGENT",
      recommendedActions: ["Apply pressure", "Clean with saline", "Elevate leg"],
      handoffSummary: "Patient has a deep laceration on the left leg with moderate bleeding.",
      disclaimer: "AI-generated triage assistance."
    };

    const result = triageSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should fail if required fields are missing', () => {
    const invalidData = {
      urgency: "CRITICAL"
      // Missing visualObservations, recommendedActions, etc.
    };

    const result = triageSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should throw error in validateTriageResponse for invalid data', () => {
    const invalidData = { bad: 'data' };
    expect(() => validateTriageResponse(invalidData)).toThrow('Invalid model response schema');
  });

  it('should handle unrecognized urgency as invalid if not in enum', () => {
    const invalidUrgency = {
      urgency: "EXTREME", // Not in CRITICAL, URGENT, STABLE, UNKNOWN
      visualObservations: "None",
      recommendedActions: ["A", "B", "C"],
      handoffSummary: "None",
      disclaimer: "None"
    };
    const result = triageSchema.safeParse(invalidUrgency);
    expect(result.success).toBe(false);
  });
});
