import { describe, it, expect } from 'vitest';
import { FLAVORS, DEFAULT_FLAVOR, getFlavor } from '../src/flavors.js';

describe('flavors', () => {
  it('tem os três sabores da spec, na ordem, com as cores certas', () => {
    expect(FLAVORS.map((f) => [f.id, f.accent])).toEqual([
      ['original', '#C6FF00'],
      ['ice', '#3DF2FF'],
      ['berry', '#FF3DCB'],
    ]);
  });

  it('o sabor padrão existe', () => {
    expect(getFlavor(DEFAULT_FLAVOR).name).toBe('Original');
  });

  it('getFlavor falha com id desconhecido', () => {
    expect(() => getFlavor('uva')).toThrow('Sabor desconhecido: uva');
  });
});
