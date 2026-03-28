import { describe, it } from 'node:test';
import * as assert from 'node:assert';
import { overrideUrgency } from '../lib/rules';

describe('Rules: overrideUrgency', () => {
  it('should return immediate if note contains "not responding"', () => {
    const result = overrideUrgency('Patient is not responding at all', 'STABLE');
    assert.strictEqual(result, 'immediate');
  });

  it('should return immediate if note contains "chest pain"', () => {
    const result = overrideUrgency('He complains of severe chest pain.', 'URGENT');
    assert.strictEqual(result, 'immediate');
  });

  it('should return modelUrgency if normal text is provided', () => {
    const result = overrideUrgency('Minor scrape on the knee', 'STABLE');
    assert.strictEqual(result, 'STABLE');
  });

  it('should handle case insensitivity', () => {
    const result = overrideUrgency('UNCONSCIOUS patient', 'UNKNOWN');
    assert.strictEqual(result, 'immediate');
  });

  it('should handle empty notes', () => {
    const result = overrideUrgency('', 'URGENT');
    assert.strictEqual(result, 'URGENT');
  });
});
