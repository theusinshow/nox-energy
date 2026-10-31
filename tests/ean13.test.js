import { describe, it, expect } from 'vitest';
import { ean13, ean13CheckDigit, ean13Modules } from '../src/scene/ean13.js';

describe('EAN-13', () => {
  it('calcula o dígito verificador de códigos conhecidos', () => {
    expect(ean13CheckDigit('400638133393')).toBe(1); // 4006381333931
    expect(ean13CheckDigit('590123412345')).toBe(7); // 5901234123457
    expect(ean13('590123412345')).toBe('5901234123457');
  });

  it('gera 95 módulos com as guardas nos lugares certos', () => {
    const bits = ean13Modules('5901234123457');
    expect(bits).toHaveLength(95);
    expect(bits.slice(0, 3)).toBe('101');
    expect(bits.slice(45, 50)).toBe('01010');
    expect(bits.slice(92)).toBe('101');
  });

  it('usa a paridade do primeiro dígito (5 → LGGLLG)', () => {
    const bits = ean13Modules('5901234123457');
    expect(bits.slice(3, 10)).toBe('0001011'); // 9 em L
    expect(bits.slice(10, 17)).toBe('0100111'); // 0 em G
  });

  it('rejeita entrada inválida', () => {
    expect(() => ean13CheckDigit('123')).toThrow('12 dígitos');
    expect(() => ean13Modules('5901234123458')).toThrow('Dígito verificador inválido');
  });
});
