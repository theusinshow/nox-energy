import * as THREE from 'three';
import { getFlavor, SPECS } from '../flavors.js';
import { CAN, bodyHeight } from './profile.js';

const W = 2048;
// Altura proporcional à circunferência, para o desenho não sair esticado na lata.
const H = Math.round((W * bodyHeight()) / (2 * Math.PI * CAN.radius));
// O cilindro usa thetaStart = PI, então u = 0.5 (centro do canvas) fica de frente para a câmera.
const FRONT = W / 2;
const cache = new Map();

export function getLabelTexture(flavorId, maxAnisotropy = 1) {
  if (cache.has(flavorId)) return cache.get(flavorId);
  const texture = new THREE.CanvasTexture(drawLabel(getFlavor(flavorId)));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  cache.set(flavorId, texture);
  return texture;
}

function drawLabel(flavor) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fundo preto fosco com leve gradiente vertical
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#161816');
  bg.addColorStop(1, '#060706');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Linhas finas de ponta a ponta, como no cartão de visita
  ctx.strokeStyle = hexWithAlpha(flavor.accent, 0.45);
  ctx.lineWidth = 3;
  for (const y of [H * 0.07, H * 0.93]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // "NØX" na vertical, na frente
  ctx.save();
  ctx.translate(FRONT, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '800 100px Unbounded';
  const size = Math.round((100 * H * 0.74) / ctx.measureText('NØX').width);
  ctx.font = `800 ${size}px Unbounded`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = flavor.accent;
  ctx.fillText('NØX', 0, 0);
  ctx.restore();

  // Coluna esquerda: specs em mono
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.font = '500 34px "JetBrains Mono"';
  ctx.fillStyle = '#9AA095';
  [`${SPECS.caffeine} CAFFEINE`, `${SPECS.sugar} SUGAR`, SPECS.kcal, SPECS.volume].forEach((line, i) =>
    ctx.fillText(line, FRONT - 260, H * 0.62 + i * 52),
  );

  // Coluna direita: nome e código do sabor
  ctx.textAlign = 'left';
  ctx.font = '600 72px Manrope';
  ctx.fillStyle = '#EDEFEA';
  ctx.fillText(flavor.name.toUpperCase(), FRONT + 260, H * 0.3);
  ctx.font = '500 34px "JetBrains Mono"';
  ctx.fillStyle = flavor.accent;
  ctx.fillText(`${flavor.code} / ENERGY DRINK`, FRONT + 262, H * 0.3 + 60);

  // Verso: textos legais e código de barras decorativo
  ctx.font = '400 26px "JetBrains Mono"';
  ctx.fillStyle = '#6B7066';
  ['NØX ENERGY CO.', 'PROJETO CONCEITUAL', 'DE PORTFÓLIO'].forEach((line, i) => ctx.fillText(line, 120, H * 0.3 + i * 40));
  ['CONTÉM CAFEÍNA.', 'NÃO RECOMENDADO PARA CRIANÇAS,', 'GESTANTES E SENSÍVEIS À CAFEÍNA.'].forEach((line, i) =>
    ctx.fillText(line, 1520, H * 0.3 + i * 40),
  );
  ctx.fillStyle = '#C8CCC4';
  let x = 1520;
  for (let i = 0; i < 46; i++) {
    const w = [3, 5, 8][(i * 7) % 3];
    ctx.fillRect(x, H * 0.6, w, 150);
    x += w + (i % 2 ? 6 : 4);
  }

  return canvas;
}

function hexWithAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
