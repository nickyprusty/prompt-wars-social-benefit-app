import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitTriageText } from '../app/actions/triage';

vi.mock('../lib/genai', () => ({
  getGenerativeModel: vi.fn().mockReturnValue({
    generateContent: vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify({
          userProvidedSummary: "Test emergency",
          visualObservations: "Test symptoms",
          inferredConcerns: "Test concerns",
          urgency: "STABLE",
          recommendedActions: ["Action 1", "Action 2", "Action 3"],
          handoffSummary: "Test brief",
          disclaimer: "Test disclaimer"
        })
      }
    })
  })
}));

describe('Triage API: submitTriageText', () => {
  it('should return a structured response from mocked model', async () => {
    const result = await submitTriageText("Patient with a minor headache", "No transcript");
    
    expect(result.urgency).toBe('STABLE');
    expect(result.immediate_steps).toHaveLength(3);
    expect(result.paramedic_brief).toBe('Test brief');
  });

  it('should override urgency if trigger phrases are present', async () => {
    // Note: The mock above returns STABLE. "Not responding" should override to "immediate".
    const result = await submitTriageText("Patient is not responding", "");
    expect(result.urgency).toBe('immediate');
  });

  it('should fail if description is too short', async () => {
    await expect(submitTriageText("ABC", "")).rejects.toThrow("Please provide a more detailed emergency description.");
  });
});
