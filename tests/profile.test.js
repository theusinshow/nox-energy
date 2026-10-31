import { describe, it, expect } from 'vitest';
import { CAN, bottomProfile, topProfile, bodyHeight } from '../src/scene/profile.js';

describe('perfil da lata', () => {
  it('o fundo começa no eixo e termina na borda inferior do corpo', () => {
    const p = bottomProfile();
    expect(p[0][0]).toBe(0);
    expect(p.at(-1)).toEqual([CAN.radius, CAN.bodyBottom]);
  });

  it('o topo começa na borda superior do corpo e termina no eixo', () => {
    const p = topProfile();
    expect(p[0]).toEqual([CAN.radius, CAN.bodyTop]);
    expect(p.at(-1)[0]).toBe(0);
  });

  it('nenhum ponto tem raio negativo nem maior que o corpo', () => {
    for (const [x] of [...bottomProfile(), ...topProfile()]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(CAN.radius);
    }
  });

  it('o corpo tem altura positiva', () => {
    expect(bodyHeight()).toBeGreaterThan(0);
  });
});
