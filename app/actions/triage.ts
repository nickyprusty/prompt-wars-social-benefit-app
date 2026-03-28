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
  note?: string,
  voiceTranscript?: string
): Promise<TriageResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  if (!base64Image || base64Image.trim() === "") {
    throw new Error("No image data provided for triage.");
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
    Analyze this medical situation based on an image and optional context.
    
    Context provided by user:
    - Typed Note: ${note || "None"}
    - Voice Transcript: ${voiceTranscript || "None"}

    Act as an emergency intake triage assistant.
    Return a strictly structured JSON response matching this exact schema:
    - "userProvidedSummary": string (Summarize the situation based on the note and transcript)
    - "visualObservations": string (1-2 short bullet points max based on image)
    - "inferredConcerns": string (1 concise sentence max)
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

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 15000)
    );

    const result = (await Promise.race([
      model.generateContent([prompt, imagePart]),
      timeoutPromise
    ])) as any;
    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText);

    // Validate Gemini response schema
    const validatedData = validateTriageResponse(parsedData);

    // Evaluate rules to potentially override urgency.
    // If no note or transcript was provided, we use the model's visual observations text.
    const textContext = `${note || ""} ${voiceTranscript || ""}`.trim() || `${validatedData.visualObservations} ${validatedData.inferredConcerns}`;
    const finalUrgency = overrideUrgency(textContext, validatedData.urgency);

    return {
      urgency: finalUrgency as TriageResult["urgency"],
      analysis: `${validatedData.visualObservations} ${validatedData.inferredConcerns}`,
      immediate_steps: validatedData.recommendedActions,
      paramedic_brief: validatedData.handoffSummary
    };
  } catch (error) {
    if (error instanceof Error && error.message === "TIMEOUT") {
      throw new Error("Analysis took too long. Please retry or contact emergency services if critical.");
    }
    console.error("DEBUG - Triage Execution Error:", error);
    // Return safe fallback error
    throw new Error("Failed to process triage image. Please try again or call 911.");
  }
}

export async function submitTriageText(
  description: string,
  voiceTranscript?: string
): Promise<TriageResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }

  if (!description || description.trim() === "") {
    throw new Error("Emergency description cannot be empty.");
  }

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });

    const prompt = `
    Analyze the following explicitly described medical situation/incident.
    Act as an emergency intake triage assistant.

    Context provided by user:
    - Typed Description: ${description}
    - Voice Transcript: ${voiceTranscript || "None"}

    Return a strictly structured JSON response matching this exact schema:
    - "userProvidedSummary": string (Summarize the situation based on the description and transcript)
    - "visualObservations": string (1-2 short bullet points max describing the key symptoms mentioned)
    - "inferredConcerns": string (1 concise sentence max)
    - "urgency": "CRITICAL", "URGENT", "STABLE", or "UNKNOWN"
    - "recommendedActions": array of exactly 3 short action strings
    - "handoffSummary": a professional 2-sentence summary for paramedics
    - "disclaimer": string
    `;

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("TIMEOUT")), 15000)
    );

    const result = (await Promise.race([
      model.generateContent([
        prompt
      ]),
      timeoutPromise
    ])) as any;
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
  } catch (error) {
    if (error instanceof Error && error.message === "TIMEOUT") {
      throw new Error("Analysis took too long. Please retry or contact emergency services if critical.");
    }
    console.error("Text Triage Error:", error);
    throw new Error("Failed to process text triage. Please try again.");
  }
}

import { transcribeAudio as _transcribeAudio } from "@/lib/speech";

export async function transcribeAudio(base64Audio: string, mimeType: string) {
  return await _transcribeAudio(base64Audio, mimeType);
}

