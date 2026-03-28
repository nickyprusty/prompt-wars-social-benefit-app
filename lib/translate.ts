/**
 * Minimal translation helper using Google Cloud Translation API v2.
 * This is a lightweight implementation for emergency triage results.
 */

const API_KEY = process.env.GOOGLE_TRANSLATE_API_KEY;

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  if (!text || !targetLanguage || targetLanguage === "en") {
    return text;
  }

  if (!API_KEY) {
    console.warn("GOOGLE_TRANSLATE_API_KEY is not defined. Falling back to English.");
    return text;
  }

  try {
    const response = await fetch(
      `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: text,
          target: targetLanguage,
          format: "text",
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Translation API Error:", errorData);
      return text; // Fallback to original text
    }

    const data = await response.json();
    return data.data.translations[0].translatedText;
  } catch (error) {
    console.error("Failed to translate text:", error);
    return text; // Fallback to original text
  }
}
