# Emergency Intake Copilot

## 1. Product Overview
Emergency Intake Copilot is a swift medical triage application designed for high-stress situations. It analyzes visual scenes during emergencies, providing immediate stabilizing steps and a structured summary for paramedic handoff.

## 2. Chosen Persona
**Family Member / Bystander in Medical Emergency:** Designed specifically for panicked, non-medical individuals faced with a rapidly unfolding medical crisis, who need clear instructions while waiting for professional help.

## 3. Problem Statement
The cognitive overload experienced during medical emergencies often results in delayed stabilizing actions and poor, unstructured communication with arriving healthcare professionals.

## 4. Approach and Logic
We use a **hybrid system** to combine AI reasoning with explicit business rules:
- **Gemini (Interpretation):** Extracts structured context from photos, interpreting physical symptoms, mechanism of injury, and generating recommended stabilizing steps.
- **Rules (Urgency Override):** A deterministic rule engine guarantees critical conditions. If the AI's textual analysis contains explicit trigger phrases (like "not responding", "unconscious", "chest pain"), strict logic safely overrides the AI and forces an `"immediate"` urgency state.

## 5. How the App Works
- 🚑 **AI-Powered Triage**: Uses Gemini 2.5 Flash to analyze medical situations from images and text.
- 🎙️ **Voice Input Support**: Record or upload audio for hands-free intake, transcribed via Google Speech-to-Text.
- 🏥 **Nearby Hospitals**: Automatic lookup of the top 3 closest medical facilities using Google Maps Places API.

## 6. Google Services Used
### Google Cloud & AI Services
- **Gemini 2.5 Flash**: Multi-modal reasoning (Image + Text + Voice).
- **Google Speech-to-Text**: Automatic transcription of emergency voice notes.
- **Google Maps Places API**: Real-time hospital search.
- **Google Cloud Translation**: Multi-lingual support for triage results.
- **Google Cloud Run:** Fully managed deployment infrastructure ensuring fast and scalable hosting.

## 7. Safety Boundaries
- **Not a Diagnostic Tool:** This model provides assistive capabilities only; it does not constitute professional medical advice.
- **Not a Replacement for Emergency Services:** This tool runs alongside calling 911, it is not a substitution. For critical cases, the UI explicitly directs users to call emergency services.

## 8. Assumptions
- The tool's interpretation relies strictly on the current image. It cannot review medical history.
- The outcome depends heavily on the visual quality and clarity of the provided image.

## 9. Efficiency Optimizations

This application has been optimized for performance and resource usage:

- **Early Validation**: API requests are validated immediately for empty content or invalid file types, preventing unnecessary model calls.
- **Client-Side Compression**: Images are resized and compressed in the browser before upload, significantly reducing payload size and network latency.
- **Timeout Protection**: All Gemini model calls are wrapped in a 15-second timeout to prevent requests from stalling.
- **Lightweight Architecture**: Single-call triage logic and efficient state management keep resource usage low.

## 10. Testing
Testing is kept lightweight and focused on rule overriding and schema validation using native Node `node:test`.

**Manual Test Scenarios:**
1. Upload an image of someone sleeping -> verify `STABLE` or `UNKNOWN` urgency.
2. Upload an image with a visible deep laceration -> verify `URGENT`.
3. Provide analysis text containing "chest pain" -> verify deterministic rule engine overwrite to `immediate`.
4. Upload an invalid file type (e.g. PDF) or massive file -> verify security boundary bounce.

## 10. Security Considerations
- **No Persistent Storage:** We do not save or log images; data lives temporarily in memory and is immediately discarded.
- **Minimal Asset Processing:** Strict limits enforce files > 10MB or invalid non-image mime types are dropped before hitting the AI model.
- **Durable Environment Variables:** Keys (e.g., `GEMINI_API_KEY`, `GOOGLE_MAPS_API_KEY`) run entirely server-side and are safely modeled in `.env.example`.

## 11. How to Run Locally

First, clone and set your environment variables:
```bash
cp .env.example .env
# Add your GEMINI_API_KEY and GOOGLE_MAPS_API_KEY to the .env file
```

Run instructions:
```bash
npm install
npm run dev
# In a separate terminal, to verify AI logic and schema:
npm run test
```
