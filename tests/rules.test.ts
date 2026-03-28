import { describe, it, expect } from 'vitest';
import { overrideUrgency } from '../lib/rules';

describe('Rules: overrideUrgency', () => {
  it('should return immediate if note contains "not responding"', () => {
    const result = overrideUrgency('Patient is not responding at all', 'STABLE');
    expect(result).toBe('immediate');
  });

  it('should return immediate if note contains "unconscious"', () => {
    const result = overrideUrgency('Found unconscious on the floor', 'URGENT');
    expect(result).toBe('immediate');
  });

  it('should return immediate if note contains "chest pain"', () => {
    const result = overrideUrgency('He complains of severe chest pain.', 'URGENT');
    expect(result).toBe('immediate');
  });

  it('should return modelUrgency if normal text is provided', () => {
    const result = overrideUrgency('Minor scrape on the knee', 'STABLE');
    expect(result).toBe('STABLE');
  });

  it('should handle case insensitivity', () => {
    const result = overrideUrgency('UNCONSCIOUS patient', 'UNKNOWN');
    expect(result).toBe('immediate');
  });

  it('should handle empty notes', () => {
    const result = overrideUrgency('', 'URGENT');
    expect(result).toBe('URGENT');
  });
});
