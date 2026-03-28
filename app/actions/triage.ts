"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY!;
const genAI = new GoogleGenerativeAI(apiKey);

export type TriageResult = {
  urgency: "CRITICAL" | "URGENT" | "STABLE" | "UNKNOWN";
  analysis: string;
  immediate_steps: string[];
  paramedic_brief: string;
};

export async function submitTriageImage(
  base64Image: string,
  mimeType: string
): Promise<TriageResult> {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on the server.");
  }
  
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
    Return a strictly structured JSON response with the following keys:
    - "urgency": Must be exactly one of "CRITICAL", "URGENT", "STABLE". If you cannot determine, classify as "UNKNOWN".
    - "analysis": A 1-sentence reasoning for the assigned urgency.
    - "immediate_steps": An array of exactly 3 concise, life-saving/stabilizing actions the bystander should take right now.
    - "paramedic_brief": A concise, highly professional medical summary (2-3 sentences max) ready for handoff to arriving paramedics. This must focus on visible symptoms and mechanism of injury if apparent.
    `;

    const imagePart = {
      inlineData: {
        data: base64Image.split(",")[1] || base64Image,
        mimeType,
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const responseText = result.response.text();
    const parsedData = JSON.parse(responseText) as TriageResult;

    return parsedData;
  } catch (error) {
    console.error("Triage Error:", error);
    throw new Error("Failed to process triage image.");
  }
}
