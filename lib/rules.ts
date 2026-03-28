export function overrideUrgency(note: string, modelUrgency: string): string {
  if (!note) return modelUrgency;

  const lowerNote = note.toLowerCase();
  const triggerPhrases = [
    "not responding",
    "unconscious",
    "not breathing",
    "severe bleeding",
    "chest pain"
  ];

  for (const phrase of triggerPhrases) {
    if (lowerNote.includes(phrase)) {
      return "immediate";
    }
  }

  return modelUrgency;
}
