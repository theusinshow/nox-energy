import { describe, it, expect } from 'vitest';
import { wavePoints, waveSample } from '../src/scene/waves.js';

const KINDS = ['square', 'sine', 'saw'];

describe('ondas do rótulo', () => {
  it.each(KINDS)('%s fecha sem emenda ao dar a volta', (kind) => {
    const p = wavePoints(kind, { width: 2048, cycles: 20, amplitude: 40 });
    expect(p[0][0]).toBe(0);
    expect(p.at(-1)[0]).toBe(2048);
    expect(p.at(-1)[1]).toBeCloseTo(p[0][1], 6);
  });

  it.each(KINDS)('%s nunca passa da amplitude', (kind) => {
    for (const [, y] of wavePoints(kind, { width: 2048, cycles: 24, amplitude: 40 })) {
      expect(Math.abs(y)).toBeLessThanOrEqual(40 + 1e-9);
    }
  });

  it('a onda quadrada só tem os dois níveis', () => {
    const ys = new Set(wavePoints('square', { width: 512, cycles: 4, amplitude: 10 }).map(([, y]) => Math.abs(y)));
    expect([...ys]).toEqual([10]);
  });

  it('falha com onda desconhecida ou ciclos não inteiros', () => {
    expect(() => waveSample('triangle', 0)).toThrow('Onda desconhecida: triangle');
    expect(() => wavePoints('sine', { width: 100, cycles: 2.5, amplitude: 1 })).toThrow('inteiro');
  });
});
