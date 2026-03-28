"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { validateTriageResponse } from "@/lib/schema";
import { overrideUrgency } from "@/lib/rules";

// Security Consideration: API key is loaded via env vars, never hardcoded.
const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export type TriageResult = {
  urgency: "CRITICAL" | "URGENT" | "STABLE" | "UNKNOWN" | "immediate";
  analysis: string;
  immediate_steps: string[];
  paramedic_brief: string;
};

export async function submitTriageImage(
  base64Image: string,
  mimeType: string,
  note?: string
): Promise<TriageResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  
  // Security: Allow only image mime types
  const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heif", "image/heic"];
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new Error("Invalid file type. Only images are allowed.");
  }

  // Security: Limit file size to a reasonable payload size (e.g. ~10MB)
  const approxSizeBytes = base64Image.length * 0.75;
  if (approxSizeBytes > 10 * 1024 * 1024) {
    throw new Error("Image too large. Please keep under 10MB.");
  }

  // Security consideration: No persistent storage of sensitive data or images occurs here.
  // The model is assistive, not an authoritative diagnostic tool.

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
    Analyze this image of a medical situation/incident.
    Act as an emergency intake triage assistant.
    Return a strictly structured JSON response matching this exact schema:
    - "userProvidedSummary": string (leave empty if none provided)
    - "visualObservations": string
    - "inferredConcerns": string
    - "urgency": "CRITICAL", "URGENT", "STABLE", or "UNKNOWN"
    - "recommendedActions": array of exactly 3 short action strings
    - "handoffSummary": a professional 2-sentence summary for paramedics
    - "disclaimer": string
    `;

    const imagePart = {
      inlineData: {
        data: base64Image.split(",")[1] || base64Image,
        mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    // Validate Gemini response schema
    const validatedData = validateTriageResponse(parsedData);

    // Evaluate rules to potentially override urgency.
    // If no note was provided, we use the model's visual observations text.
    const textContext = note || `${validatedData.visualObservations} ${validatedData.inferredConcerns}`;
    const finalUrgency = overrideUrgency(textContext, validatedData.urgency);

    return {
      urgency: finalUrgency as TriageResult["urgency"],
      analysis: `${validatedData.visualObservations} ${validatedData.inferredConcerns}`,
      immediate_steps: validatedData.recommendedActions,
      paramedic_brief: validatedData.handoffSummary
    };
  } catch (error) {
    console.error("Triage Error:", error);
    // Return safe fallback error
    throw new Error("Failed to process triage image or result was invalid.");
  }
}
