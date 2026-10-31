import { CAMERA } from '../scene/camera.js';
import { canBounds } from '../scene/profile.js';

// A lata mora em "slots": caixas vazias do layout onde nenhum texto entra.
// Estas funções convertem o retângulo de um slot (px) em pose da lata (unidades 3D, z = 0).
const BOUNDS = canBounds();
const FIT = 0.92; // folga para a inclinação do mouse e a inércia da rolagem

export function unitsPerPixel(view) {
  return (2 * CAMERA.z * Math.tan((CAMERA.fov * Math.PI) / 360)) / view.height;
}

// Caixa projetada no plano z = 0. A face da frente (z = +r) fica mais perto da câmera e
// aparece maior; longe do centro da tela isso empurra a borda para fora do slot.
export function projectedBox({ x, y, scale }) {
  const r = BOUNDS.radius * scale;
  const near = CAMERA.z / (CAMERA.z - r);
  const far = CAMERA.z / (CAMERA.z + r);
  const xs = [x - r, x + r].flatMap((v) => [v * near, v * far]);
  const ys = [y + BOUNDS.top * scale, y + BOUNDS.bottom * scale].flatMap((v) => [v * near, v * far]);
  return { left: Math.min(...xs), right: Math.max(...xs), top: Math.max(...ys), bottom: Math.min(...ys) };
}

export function poseForRect(rect, view) {
  const k = unitsPerPixel(view);
  const target = {
    left: (rect.left - view.width / 2) * k,
    right: (rect.left + rect.width - view.width / 2) * k,
    top: -(rect.top - view.height / 2) * k,
    bottom: -(rect.top + rect.height - view.height / 2) * k,
  };
  const cx = (target.left + target.right) / 2;
  const cy = (target.top + target.bottom) / 2;
  let scale = Math.min((target.top - target.bottom) / (BOUNDS.top - BOUNDS.bottom), (target.right - target.left) / (2 * BOUNDS.radius));
  let pose = { x: cx, y: cy - ((BOUNDS.top + BOUNDS.bottom) / 2) * scale, scale };
  // Ajusta escala e centro até a caixa projetada caber no slot (converge em poucas voltas).
  for (let i = 0; i < 4; i++) {
    const box = projectedBox(pose);
    scale *= Math.min((target.top - target.bottom) / (box.top - box.bottom), (target.right - target.left) / (box.right - box.left));
    pose = { x: pose.x + cx - (box.left + box.right) / 2, y: pose.y + cy - (box.top + box.bottom) / 2, scale };
  }
  // A folga encolhe em volta do centro do slot.
  const box = projectedBox({ ...pose, scale: scale * FIT });
  const fitted = { ...pose, scale: scale * FIT };
  fitted.y += cy - (box.top + box.bottom) / 2;
  fitted.x += cx - (box.left + box.right) / 2;
  return fitted;
}

export function mixPose(a, b, t) {
  const out = {};
  for (const key of Object.keys(a)) out[key] = a[key] + (b[key] - a[key]) * t;
  return out;
}

// Movimento de algo que já está em cena: acelera e desacelera (ease-in-out cúbica).
export function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
