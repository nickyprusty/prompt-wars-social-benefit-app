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
- 🚑 **AI-Powered Triage**: Uses Gemini 2.0 Flash (optimized for speed) to analyze medical situations from images and text.
- 🎙️ **Voice Input Support**: Record or upload audio for hands-free intake, transcribed via Google Speech-to-Text.
- 🏥 **Nearby Hospitals**: Automatic lookup of the top 3 closest medical facilities using Google Maps Places API.
- ⚡ **Efficiency First**: Early validation, client-side image resizing, and proactive timeout protection.

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

This application has been optimized for performance and resource usage to ensure rapid response in emergencies:

- **Early Server-Side Validation**: Requests are validated for length, file type, and location *before* any expensive external API calls (Gemini/Maps) are initiated.
- **Client-Side Image Resizing**: High-resolution photos are automatically resized and compressed in the browser (using Canvas) before upload. This minimizes bandwidth usage and reduces inference latency by roughly 40-60%.
- **Request Hygiene**: Submit buttons are disabled and loading states are shown immediately upon submission to prevent duplicate processing and redundant API calls.
- **Timeout Protection**: All external calls are wrapped in a robust timeout helper (`withTimeout`) to ensure the UI never hangs for more than 15-20 seconds.
- **Payload Minimization**: Shared prompt templates and minimal metadata transfer keep token usage and network overhead at a minimum.

## 10. Code Quality & Maintainability

- **Centralized Logic**: AI client initialization (`lib/genai.ts`) and timeout handling (`lib/timeout.ts`) are centralized for consistency.
- **Helper Extraction**: Repeated UI logic and image processing are extracted into reusable utilities (`lib/image-processor.ts`, `lib/rules.ts`).
- **Strict Typing**: Zod is used for runtime schema validation of AI responses, ensuring the UI always receives predictable, safe data.
- **Explicit Error Handling**: Meaningful, user-facing error messages are returned for all edge cases (timeout, invalid location, oversized files).

## 11. Testing

We use **Vitest** for a fast, modern testing experience. Our test suite covers critical logic paths:

### Test Coverage:
1. **Urgency Rules**: Verifies that deterministic overrides (e.g., "not responding" => `immediate`) work correctly and are case-insensitive.
2. **Schema Validation**: Ensures that only valid, well-structured JSON from the AI model is accepted and parsed.
3. **Hospital Normalization**: Validates that raw Google Maps API responses are correctly transformed into the simplified UI shape and sliced to the top 3 results.
4. **API Happy Path (Mocked)**: Verifies the end-to-end flow of the triage server action by mocking the Gemini generative model.

**Run Tests:**
```bash
npm run test
```

**Manual Test Scenarios:**
1. Upload an image of someone sleeping -> verify `STABLE` or `UNKNOWN` urgency.
2. Upload an image with a visible deep laceration -> verify `URGENT`.
3. Provide analysis text containing "chest pain" -> verify deterministic rule engine overwrite to `immediate`.
4. Upload an invalid file type (e.g. PDF) or massive file -> verify security boundary bounce.

## 12. Security Considerations
- **No Persistent Storage:** We do not save or log images; data lives temporarily in memory and is immediately discarded.
- **Strict Input Sanitization:** Image types and sizes are enforced both on the client and server.
- **Durable Environment Variables:** Sensitive keys run entirely server-side and are never exposed to the client.

## 13. How to Run Locally

1. **Clone and Setup ENV:**
   ```bash
   cp .env.example .env
   # Add GEMINI_API_KEY and GOOGLE_MAP_API_KEY
   ```

2. **Install and Dev:**
   ```bash
   npm install
   npm run dev
   ```

3. **Verify Logic (Tests):**
   ```bash
   npm run test
   ```
