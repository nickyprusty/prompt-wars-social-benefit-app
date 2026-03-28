"use server";

/**
 * Minimal helper to transcribe audio using Google Speech-to-Text REST API.
 */

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY || process.env.GOOGLE_MAPS_API_KEY;

export async function transcribeAudio(base64Audio: string, mimeType: string): Promise<string> {
  if (!base64Audio || !mimeType) {
    throw new Error("Missing audio data or mime type.");
  }

  if (!API_KEY) {
    console.warn("No Google API Key found for Speech-to-Text. Falling back to default empty string.");
    return "";
  }

  try {
    // Remove data URL prefix if present
    const audioData = base64Audio.includes(",") ? base64Audio.split(",")[1] : base64Audio;

    const response = await fetch(
      `https://speech.googleapis.com/v1/speech:recognize?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: {
            encoding: "WEBM_OPUS", // Most common for browser MediaRecorder
            sampleRateHertz: 48000,
            languageCode: "en-US",
            enableAutomaticPunctuation: true,
          },
          audio: {
            content: audioData,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Speech-to-Text API Error:", errorData);
      throw new Error(`Speech-to-Text API failed: ${errorData.error?.message || "Unknown error"}`);
    }

    const data = await response.json();
    const transcript = data.results
      ?.map((result: any) => result.alternatives[0].transcript)
      .join("\n") || "";

    return transcript;
  } catch (error) {
    console.error("Transcription failed:", error);
    throw error;
  }
}
