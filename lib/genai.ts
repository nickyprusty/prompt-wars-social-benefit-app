import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY!;

if (!apiKey) {
  console.warn("GEMINI_API_KEY is not configured on the server.");
}

export const genAI = new GoogleGenerativeAI(apiKey);

export const DEFAULT_MODEL = "gemini-2.0-flash"; // Standardized model choice

export function getGenerativeModel(config = {}) {
  return genAI.getGenerativeModel({
    model: DEFAULT_MODEL,
    generationConfig: {
      responseMimeType: "application/json",
      ...config
    },
  });
}
