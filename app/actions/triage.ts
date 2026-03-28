"use server";

import { validateTriageResponse } from "@/lib/schema";
import { overrideUrgency } from "@/lib/rules";
import { getGenerativeModel } from "@/lib/genai";
import { withTimeout } from "@/lib/timeout";

export type TriageResult = {
  urgency: "CRITICAL" | "URGENT" | "STABLE" | "UNKNOWN" | "immediate";
  analysis: string;
  immediate_steps: string[];
  paramedic_brief: string;
};

const TRIAGE_PROMPT_BASE = `
Act as an emergency intake triage assistant.
Analyze the provided medical situation and return a strictly structured JSON response.
Schema:
- "userProvidedSummary": string
- "visualObservations": string (1-2 short bullet points)
- "inferredConcerns": string (1 concise sentence)
- "urgency": "CRITICAL", "URGENT", "STABLE", or "UNKNOWN"
- "recommendedActions": array of exactly 3 short strings
- "handoffSummary": 2-sentence professional paramedic summary
- "disclaimer": string
`;

/**
 * Validates input common to both image and text triage.
 */
function validateCommonInput(transcript?: string) {
  if (transcript && transcript.length > 5000) {
    throw new Error("Transcript too long. Please stay concise.");
  }
}

export async function submitTriageImage(
  base64Image: string,
  mimeType: string,
  note?: string,
  voiceTranscript?: string
): Promise<TriageResult> {
  // Early Validation
  if (!base64Image || base64Image.trim() === "") {
    throw new Error("No image data provided for triage.");
  }
  
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heif", "image/heic"];
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Invalid file type. Only images (JPEG, PNG, WEBP, HEIF) are allowed.");
  }

  const approxSizeBytes = base64Image.length * 0.75;
  if (approxSizeBytes > 15 * 1024 * 1024) { // Increased slightly for high-res, but still capped
    throw new Error("Image too large. Please keep under 15MB.");
  }

  validateCommonInput(voiceTranscript);

  try {
    const model = getGenerativeModel();
    const prompt = `${TRIAGE_PROMPT_BASE}\n\nContext:\n- Note: ${note || "None"}\n- Transcript: ${voiceTranscript || "None"}`;

    const imagePart = {
      inlineData: {
        data: base64Image.split(",")[1] || base64Image,
        mimeType,
      },
    };

    const result = await withTimeout(
      model.generateContent([prompt, imagePart]),
      20000, // 20s for multimodal
      "Analysis timed out. Please retry or call emergency services."
    );

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);
    const validatedData = validateTriageResponse(parsedData);

    const textContext = `${note || ""} ${voiceTranscript || ""}`.trim() || `${validatedData.visualObservations} ${validatedData.inferredConcerns}`;
    const finalUrgency = overrideUrgency(textContext, validatedData.urgency);

    return {
      urgency: finalUrgency as TriageResult["urgency"],
      analysis: `${validatedData.visualObservations} ${validatedData.inferredConcerns}`,
      immediate_steps: validatedData.recommendedActions,
      paramedic_brief: validatedData.handoffSummary
    };
  } catch (error: any) {
    console.error("Triage Image Error:", error);
    throw new Error(error.message || "Failed to process triage image.");
  }
}

export async function submitTriageText(
  description: string,
  voiceTranscript?: string
): Promise<TriageResult> {
  // Early Validation
  if (!description || description.trim().length < 5) {
    throw new Error("Please provide a more detailed emergency description.");
  }

  validateCommonInput(voiceTranscript);

  try {
    const model = getGenerativeModel();
    const prompt = `${TRIAGE_PROMPT_BASE}\n\nContext:\n- Description: ${description}\n- Transcript: ${voiceTranscript || "None"}`;

    const result = await withTimeout(
      model.generateContent([prompt]),
      15000,
      "Text analysis timed out. Please retry."
    );

    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);
    const validatedData = validateTriageResponse(parsedData);

    const textContext = `${description} ${voiceTranscript || ""} ${validatedData.visualObservations} ${validatedData.inferredConcerns}`.trim();
    const finalUrgency = overrideUrgency(textContext, validatedData.urgency);

    return {
      urgency: finalUrgency as TriageResult["urgency"],
      analysis: `${validatedData.visualObservations} ${validatedData.inferredConcerns}`,
      immediate_steps: validatedData.recommendedActions,
      paramedic_brief: validatedData.handoffSummary,
    };
  } catch (error: any) {
    console.error("Triage Text Error:", error);
    throw new Error(error.message || "Failed to process text triage.");
  }
}

import { transcribeAudio as _transcribeAudio } from "@/lib/speech";

export async function transcribeAudio(base64Audio: string, mimeType: string) {
  return await _transcribeAudio(base64Audio, mimeType);
}
