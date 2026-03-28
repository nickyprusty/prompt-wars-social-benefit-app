# Emergency Intake Copilot

Emergency Intake Copilot is a high-fidelity, panic-friendly medical triage application designed for high-stress situations. It utilizes **Google Gemini 1.5 Flash** to rapidly assess user-uploaded images of medical emergencies and extract structured context, empowering bystanders to take immediate life-saving action.

## Pitch & Vertical

- **Persona Vertical:** Medical Emergency / Family Persona. Designed for non-technical, panicked users in high-stress medical situations requiring immediate intervention.
- **Problem Resolved:** The cognitive overload during an emergency often results in delayed action or improper handoffs to arriving medical personnel.
- **The Solution:** A one-hand operation "Panic UI" that analyzes the visual scene to prescribe immediate life-saving steps and standardizes a high-professionalism summary for paramedic handoff.

## Google Tech Stack

- **Reasoning Engine:** `@google/generative-ai` (Gemini 1.5 Flash - Multimodal Context Extraction).
- **Extraction Mode:** Structured JSON enforcing exact typings (`urgency`, `analysis`, `immediate_steps`, `paramedic_brief`).
- **UI Architecture:** Next.js 14, React 18, Tailwind CSS, shadcn/ui.
- **Micro-interactions:** Framer-motion for smooth UI transitions to maintain user calmness.

## Features & Accessibility

- **Panic-UI State Machine:** Strict interface states (`IDLE` -> `THINKING` -> `RESULT`).
- **Semantic & ARIA Standards:** Uses `aria-live` regions for critical state updates, guaranteeing screen readers prioritize triage outcomes. Contrast ratios exceed 4.5:1.
- **Safety First:** Hardcoded "NOT A DOCTOR" disclaimer to avoid liability and ensure users call emergency services (embedded "CALL 911" for CRITICAL conditions).

## Local Development

Ensure you have your environment variables set before running the app.
\`\`\`bash
export GEMINI_API_KEY=AIzaSy...
\`\`\`

Install and run:
\`\`\`bash
npm install
npm run dev
\`\`\`
