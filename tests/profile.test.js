import { describe, it, expect } from 'vitest';
import {
  CAN,
  bottomProfile,
  bodyProfile,
  lidProfile,
  arcLengths,
  printedHeight,
  shoulderFraction,
} from '../src/scene/profile.js';

describe('perfil da lata', () => {
  it('as três partes se encontram sem buraco', () => {
    const bottom = bottomProfile();
    const body = bodyProfile();
    const lid = lidProfile();
    expect(bottom[0][0]).toBe(0);
    expect(bottom.at(-1)).toEqual(body[0]);
    expect(body.at(-1)).toEqual(lid[0]);
    expect(lid.at(-1)).toEqual([CAN.lidPanelRadius, CAN.lidPanelY]);
  });

  it('nenhum ponto tem raio negativo nem maior que o corpo', () => {
    for (const [x] of [...bottomProfile(), ...bodyProfile(), ...lidProfile()]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(CAN.radius);
    }
  });

  it('o ombro é suavizado (vários pontos, não uma quina)', () => {
    expect(bodyProfile().length).toBeGreaterThan(20);
  });

  it('o comprimento de arco vai de 0 a 1 sem voltar', () => {
    const v = arcLengths(bodyProfile());
    expect(v[0]).toBe(0);
    expect(v.at(-1)).toBeCloseTo(1, 10);
    for (let i = 1; i < v.length; i++) expect(v[i]).toBeGreaterThan(v[i - 1]);
  });

  it('a área impressa é maior que o corpo reto e o ombro é uma faixa estreita', () => {
    expect(printedHeight()).toBeGreaterThan(CAN.shoulderStart - CAN.bodyBottom);
    expect(shoulderFraction()).toBeGreaterThan(0.05);
    expect(shoulderFraction()).toBeLessThan(0.25);
  });
});
