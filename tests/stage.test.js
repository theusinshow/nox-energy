import { describe, it, expect } from 'vitest';
import { poseForRect, mixPose, easeInOutCubic, unitsPerPixel, projectedBox } from '../src/motion/stage.js';
import { canBounds } from '../src/scene/profile.js';

const view = { width: 1440, height: 900 };

describe('palco da lata', () => {
  it('um slot no centro da tela põe a lata no centro', () => {
    const pose = poseForRect({ left: 620, top: 250, width: 200, height: 400 }, view);
    expect(pose.x).toBeCloseTo(0, 6);
    const { top, bottom } = canBounds();
    // o centro geométrico da lata (não a origem) fica no centro da tela
    expect(pose.y + ((top + bottom) / 2) * pose.scale).toBeCloseTo(0, 4);
  });

  it('a lata projetada cabe no slot, na altura e na largura', () => {
    const rects = [
      { left: 100, top: 100, width: 300, height: 600 },
      { left: 100, top: 100, width: 120, height: 600 }, // slot estreito: a largura manda
    ];
    const { top, bottom, radius } = canBounds();
    for (const rect of rects) {
      const { scale } = poseForRect(rect, view);
      const k = unitsPerPixel(view);
      expect(((top - bottom) * scale) / k).toBeLessThanOrEqual(rect.height);
      expect((2 * radius * scale) / k).toBeLessThanOrEqual(rect.width);
    }
  });

  it('com perspectiva, a lata projetada fica dentro de um slot longe do centro', () => {
    const rect = { left: 40, top: 520, width: 220, height: 360 }; // canto inferior esquerdo
    const pose = poseForRect(rect, view);
    const box = projectedBox(pose);
    const k = unitsPerPixel(view);
    const px = (wx) => wx / k + view.width / 2;
    const py = (wy) => -wy / k + view.height / 2;
    expect(px(box.left)).toBeGreaterThanOrEqual(rect.left);
    expect(px(box.right)).toBeLessThanOrEqual(rect.left + rect.width);
    expect(py(box.top)).toBeGreaterThanOrEqual(rect.top);
    expect(py(box.bottom)).toBeLessThanOrEqual(rect.top + rect.height);
  });

  it('slot à direita e acima vira x positivo e y positivo', () => {
    const pose = poseForRect({ left: 1100, top: 50, width: 200, height: 300 }, view);
    expect(pose.x).toBeGreaterThan(0);
    expect(pose.y).toBeGreaterThan(0);
  });

  it('mixPose interpola todos os campos e a curva vai de 0 a 1', () => {
    const a = { x: 0, y: 0, scale: 1, rotX: 0, rotY: 0 };
    const b = { x: 2, y: -2, scale: 0.5, rotX: 1, rotY: Math.PI };
    expect(mixPose(a, b, 0)).toEqual(a);
    expect(mixPose(a, b, 1)).toEqual(b);
    expect(mixPose(a, b, 0.5).x).toBeCloseTo(1, 10);
    expect(easeInOutCubic(0)).toBe(0);
    expect(easeInOutCubic(1)).toBe(1);
    expect(easeInOutCubic(0.5)).toBeCloseTo(0.5, 10);
  });
});
