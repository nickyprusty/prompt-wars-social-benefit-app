import { NextRequest, NextResponse } from "next/server";
import { translateText } from "@/lib/translate";

/**
 * API route to handle multilingual translation for emergency triage results.
 */
export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage } = await req.json();

    if (!text || !targetLanguage) {
      return NextResponse.json(
        { error: "Missing text or targetLanguage" },
        { status: 400 }
      );
    }

    const translatedText = await translateText(text, targetLanguage);

    return NextResponse.json({ translatedText });
  } catch (error) {
    console.error("Translation API Error:", error);
    return NextResponse.json(
      { error: "Failed to translate text" },
      { status: 500 }
    );
  }
}
