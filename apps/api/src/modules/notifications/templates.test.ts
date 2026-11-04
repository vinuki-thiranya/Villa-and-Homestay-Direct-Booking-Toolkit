import { describe, expect, it } from 'vitest';
import { orderedParams, TEMPLATES, templateBody, templateParams } from './templates.js';

describe('WhatsApp templates', () => {
  it('meet Meta rules: no variable at the start or end, examples for every variable, under 1024 chars', () => {
    for (const def of TEMPLATES) {
      for (const lang of def.languages) {
        const { text, example } = templateBody(def, lang);
        expect(text, `${def.name}/${lang}`).not.toMatch(/^\s*\{\{\d+\}\}/);
        expect(text, `${def.name}/${lang}`).not.toMatch(/\{\{\d+\}\}[\s.!।]*$/);
        expect(example.length).toBe(new Set(text.match(/\{\{\d+\}\}/g) ?? []).size);
        expect(text.length).toBeLessThan(1024);
      }
    }
  });

  it('orders parameters per language, so translations may move placeholders', () => {
    const def = TEMPLATES.find((d) => d.name === 'sd_booking_confirmed')!;
    const vars: Record<string, string> = { reference: 'SD-1', property: 'Villa', from: 'a', to: 'b', link: 'L' };
    expect(orderedParams(def, 'en', vars)).toEqual(['SD-1', 'Villa', 'a', 'b', 'L']);
    expect(orderedParams(def, 'hi', vars)).toEqual(templateParams(def, 'hi').map((n) => vars[n]));
  });
});
