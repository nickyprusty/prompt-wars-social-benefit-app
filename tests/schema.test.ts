import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { validateTriageResponse } from '../lib/schema';

describe('Schema: validateTriageResponse', () => {
  it('should pass if valid response is provided', () => {
    const validData = {
      userProvidedSummary: "Fell down stairs",
      visualObservations: "Visible bruising",
      inferredConcerns: "Possible fracture",
      urgency: "URGENT",
      recommendedActions: ["Do not move", "Apply ice", "Wait for medics"],
      handoffSummary: "Patient fell, possible fracture, iced.",
      disclaimer: "Not a doctor."
    };

    const result = validateTriageResponse(validData);
    assert.strictEqual(result.urgency, "URGENT");
  });

  it('should fail if missing fields', () => {
    const invalidData = {
      visualObservations: "Visible bruising",
      urgency: "URGENT"
      // Missing required fields
    };

    assert.throws(() => validateTriageResponse(invalidData), /Invalid model response schema/);
  });
});
