import * as THREE from 'three';
import { getFlavor, SPECS } from '../flavors.js';
import { CAN, printedHeight, shoulderFraction } from './profile.js';
import { wavePoints } from './waves.js';
import { ean13, ean13Modules } from './ean13.js';
import { drawDotMatrix } from './dotmatrix.js';

// O rótulo cobre o corpo inteiro, do pé até o gargalo (o ombro fica no topo do canvas).
// Altura proporcional à circunferência, para o desenho não sair esticado na lata.
const W = 2048;
const H = Math.round((W * printedHeight()) / (2 * Math.PI * CAN.radius));
const SHOULDER = Math.round(H * shoulderFraction());
const BODY = H - SHOULDER;
const y = (f) => SHOULDER + f * BODY; // posição vertical dentro do corpo reto, 0 a 1

// u = 0.5 (centro do canvas) fica de frente para a câmera; o verso fica na emenda.
const FRONT = W / 2;
const FRONT_W = 600;
const BACK_LEFT = FRONT - 760 - 190;
const BACK_RIGHT = FRONT + 760 - 190;
const SEAL = { x: FRONT + 445, y: y(0.3), r: 100 };
const WAVE = { y: y(0.53), amplitude: 44 };

const INK = { text: '#EEF0EA', soft: '#C4C9BF', muted: '#878D83', faint: '#2A2E29', metal: '#B9BEC3' };
// Canal G = rugosidade, canal B = metalicidade (como o three.js lê os mapas).
const SURFACE = { print: 'rgb(0, 97, 89)', metal: 'rgb(0, 56, 255)' };
const FONT = { brand: 'Unbounded', sans: 'Manrope', mono: '"JetBrains Mono"' };
const WAVE_NAMES = { square: 'PULSO QUADRADO', sine: 'SENOIDE', saw: 'DENTE DE SERRA' };

const cache = new Map();
let surface;

export function getLabelTextures(flavorId, maxAnisotropy = 1) {
  if (!cache.has(flavorId)) {
    const flavor = getFlavor(flavorId);
    const map = toTexture(drawColor(flavor), maxAnisotropy);
    const emissiveMap = toTexture(drawEmission(flavor), maxAnisotropy);
    map.colorSpace = emissiveMap.colorSpace = THREE.SRGBColorSpace;
    cache.set(flavorId, { map, emissiveMap });
  }
  return cache.get(flavorId);
}

// Igual para todos os sabores: tinta semifosca, e alumínio exposto na régua e no gargalo.
export function getSurfaceTexture(maxAnisotropy = 1) {
  surface ??= toTexture(drawSurface(), maxAnisotropy);
  return surface;
}

function toTexture(canvas, maxAnisotropy) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function drawColor(flavor) {
  const { canvas, ctx } = makeCanvas(1);
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#090A09');
  bg.addColorStop(SHOULDER / H, '#151715');
  bg.addColorStop(1, '#070807');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  drawBareMetal(ctx, INK.metal);
  drawScope(ctx, flavor);
  drawFront(ctx, flavor);
  drawSides(ctx);
  // No verso, tudo fica acima ou abaixo da faixa da onda.
  drawNutrition(ctx, BACK_LEFT, y(0.035));
  drawIngredients(ctx, BACK_LEFT, y(0.655));
  drawCodes(ctx, flavor, BACK_RIGHT, y(0.035));
  drawDisposal(ctx, BACK_RIGHT, y(0.64));
  drawInk(ctx, flavor);
  return canvas;
}

// Mapa de emissão: só a tinta neon acende; texto branco e fundo ficam apagados.
function drawEmission(flavor) {
  const { canvas, ctx } = makeCanvas(0.5);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);
  drawInk(ctx, flavor);
  return canvas;
}

function drawSurface() {
  const { canvas, ctx } = makeCanvas(0.5);
  ctx.fillStyle = SURFACE.print;
  ctx.fillRect(0, 0, W, H);
  drawBareMetal(ctx, SURFACE.metal);
  return canvas;
}

function makeCanvas(scale) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  return { canvas, ctx };
}

// Alumínio sem tinta: a faixa de texto no gargalo e a régua que dá a volta no pé.
function drawBareMetal(ctx, color) {
  const tag = 'NØX ENERGY  ·  ENERGIA QUE ACENDE NO ESCURO  ·  ';
  ctx.font = `500 19px ${FONT.mono}`;
  const step = W / Math.floor(W / (ctx.measureText(tag).width + tag.length * 3));
  for (let x = 0; x < W - 1; x += step) text(ctx, tag, x, SHOULDER * 0.44, { font: ctx.font, color, spacing: 3, baseline: 'middle' });

  // 200 divisões na volta; a marca 0 cai na emenda e fecha com a 200.
  const base = H - 14;
  ctx.fillStyle = color;
  ctx.fillRect(0, base, W, 2);
  for (let i = 0; i <= 200; i++) {
    const x = (i * W) / 200;
    const len = i % 10 === 0 ? 24 : i % 5 === 0 ? 15 : 8;
    ctx.fillRect(x - 1, base - len, 2, len);
    if (i % 10 === 0 && i < 200) text(ctx, String(i).padStart(3, '0'), x + 5, base - 12, { font: `500 13px ${FONT.mono}`, color });
  }
}

// Grade de osciloscópio atrás da onda: linha central e uma marca por período.
function drawScope(ctx, flavor) {
  const cycles = flavor.hz / 22;
  ctx.fillStyle = INK.faint;
  for (let x = 0; x < W; x += 12) ctx.fillRect(x, WAVE.y - 1, 6, 2);
  for (let c = 0; c < cycles; c++) {
    const x = (c * W) / cycles;
    ctx.fillRect(x - 1, WAVE.y - 70, 2, 140);
    ctx.fillRect(x + W / cycles / 2 - 1, WAVE.y - 8, 2, 16);
  }
}

function drawFront(ctx, flavor) {
  const left = FRONT - FRONT_W / 2;
  const right = FRONT + FRONT_W / 2;

  // Linha técnica acima da marca
  const meta = { font: `500 20px ${FONT.mono}`, color: INK.muted, spacing: 3 };
  text(ctx, flavor.code, left, y(0.105), meta);
  text(ctx, SPECS.volume.replace(/(\d+)/, '$1 '), right, y(0.105), { ...meta, align: 'right' });
  ctx.fillStyle = INK.faint;
  ctx.fillRect(left, y(0.122), FRONT_W, 2);

  // Assinatura: ENERGY DRINK com a mesma largura da marca
  const sub = 'ENERGY DRINK';
  ctx.font = `600 38px ${FONT.sans}`;
  ctx.letterSpacing = '0px';
  const spacing = (FRONT_W - ctx.measureText(sub).width) / (sub.length - 1);
  text(ctx, sub, left, y(0.33) + 62, { font: ctx.font, color: INK.soft, spacing });

  // Leitura da onda (a frequência em Hz entra pela tinta neon)
  text(ctx, WAVE_NAMES[flavor.wave], right, WAVE.y - 80, { font: `400 20px ${FONT.mono}`, color: INK.muted, spacing: 3, align: 'right' });

  // Sabor
  text(ctx, flavor.name.toUpperCase(), FRONT, y(0.745), { font: `600 104px ${FONT.sans}`, color: INK.text, spacing: 4, align: 'center' });
  text(ctx, `${flavor.taste.toUpperCase()}  ·  SEM AÇÚCAR`, FRONT, y(0.745) + 46, { font: `500 20px ${FONT.mono}`, color: INK.muted, spacing: 3, align: 'center' });

  // Especificações em quatro colunas
  const cells = [
    [SPECS.caffeine, 'CAFEÍNA'],
    [SPECS.sugar, 'AÇÚCAR'],
    [SPECS.kcal, 'ENERGIA'],
    [SPECS.volume, 'VOLUME'],
  ];
  const cellW = FRONT_W / cells.length;
  const top = y(0.85);
  cells.forEach(([spec, label], i) => {
    const [, value, unit] = spec.match(/^(\d+)(\D+)$/);
    const cx = left + cellW * (i + 0.5);
    text(ctx, value, cx, top + 44, { font: `600 46px ${FONT.sans}`, color: INK.text, align: 'center' });
    text(ctx, `${unit} ${label}`, cx, top + 76, { font: `500 15px ${FONT.mono}`, color: INK.muted, spacing: 2, align: 'center' });
    if (i) {
      ctx.fillStyle = INK.faint;
      ctx.fillRect(left + cellW * i - 1, top + 8, 2, 72);
    }
  });
}

function drawSides(ctx) {
  // Esquerda: slogan na vertical, lendo de baixo para cima
  ctx.save();
  ctx.translate(FRONT - (SEAL.x - FRONT), SEAL.y);
  ctx.rotate(-Math.PI / 2);
  text(ctx, 'ENERGIA QUE ACENDE NO ESCURO', 0, 0, { font: `600 19px ${FONT.sans}`, color: INK.soft, spacing: 3, align: 'center', baseline: 'middle' });
  ctx.restore();

  // Direita: selo de cafeína (o anel externo é tinta neon)
  const { x, y: cy, r } = SEAL;
  ctx.strokeStyle = INK.muted;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, cy, r - 36, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = `500 15px ${FONT.mono}`;
  ctx.fillStyle = INK.soft;
  textOnCircle(ctx, 'CAFEÍNA · 160 MG · CAFEÍNA · 160 MG · ', x, cy, r - 18);
  text(ctx, SPECS.caffeine.replace(/\D+/, ''), x, cy + 8, { font: `800 40px ${FONT.brand}`, color: INK.text, align: 'center' });
  text(ctx, 'MG', x, cy + 32, { font: `500 14px ${FONT.mono}`, color: INK.muted, spacing: 3, align: 'center' });
}

const NUTRITION = [
  ['Valor energético', '10 kcal', '1%'],
  ['Carboidratos', '2,4 g', '1%'],
  ['Açúcares totais', '0 g', '**'],
  ['Açúcares adicionados', '0 g', '0%'],
  ['Proteínas', '0 g', '0%'],
  ['Gorduras totais', '0 g', '0%'],
  ['Fibra alimentar', '0 g', '0%'],
  ['Sódio', '180 mg', '9%'],
  ['Cafeína', '160 mg', '**'],
  ['Taurina', '1000 mg', '**'],
];

function drawNutrition(ctx, x, top, w = 380) {
  const pad = 14;
  const line = (yy, weight) => {
    ctx.fillStyle = INK.soft;
    ctx.fillRect(x, yy, w, weight);
  };
  let yy = top;
  text(ctx, 'INFORMAÇÃO NUTRICIONAL', x + pad, yy + 34, { font: `600 22px ${FONT.sans}`, color: INK.text, spacing: 0.5 });
  text(ctx, 'Porção: 473 ml (1 lata)', x + pad, yy + 62, { font: `400 16px ${FONT.sans}`, color: INK.soft });
  yy += 76;
  line(yy, 6);
  yy += 6;
  const head = { font: `500 14px ${FONT.mono}`, color: INK.muted };
  text(ctx, '473 ml', x + w - 96, yy + 24, { ...head, align: 'right' });
  text(ctx, '%VD*', x + w - pad, yy + 24, { ...head, align: 'right' });
  yy += 34;
  line(yy, 2);
  for (const [name, value, vd] of NUTRITION) {
    text(ctx, name, x + pad, yy + 22, { font: `400 16px ${FONT.sans}`, color: INK.soft });
    text(ctx, value, x + w - 96, yy + 22, { font: `600 16px ${FONT.sans}`, color: INK.text, align: 'right' });
    text(ctx, vd, x + w - pad, yy + 22, { font: `600 16px ${FONT.sans}`, color: INK.text, align: 'right' });
    yy += 29;
    line(yy, 1);
  }
  line(yy, 4);
  yy = paragraph(ctx, '*Percentual de valores diários fornecidos pela porção. **VD não estabelecido.', x + pad, yy + 24, w - pad * 2, 18, {
    font: `400 13px ${FONT.sans}`,
    color: INK.muted,
  });
  ctx.strokeStyle = INK.soft;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, top, w, yy - top);
}

function drawIngredients(ctx, x, top, w = 380) {
  const body = { font: `400 15px ${FONT.sans}`, color: INK.soft };
  text(ctx, 'INGREDIENTES', x, top, { font: `600 15px ${FONT.sans}`, color: INK.text, spacing: 2 });
  let yy = paragraph(
    ctx,
    'Água gaseificada, taurina, regulador de acidez ácido cítrico, cafeína, aromatizante, edulcorantes sucralose e acessulfame de potássio, conservador benzoato de sódio, vitaminas B3, B6 e B12. NÃO CONTÉM GLÚTEN.',
    x,
    top + 26,
    w,
    21,
    body,
  );
  yy = paragraph(ctx, 'CONTÉM CAFEÍNA. NÃO RECOMENDADO PARA CRIANÇAS, GESTANTES E PESSOAS SENSÍVEIS À CAFEÍNA.', x, yy + 12, w, 21, {
    font: `600 15px ${FONT.sans}`,
    color: INK.text,
  });
  paragraph(ctx, 'Projeto conceitual de portfólio. NØX não é um produto real.', x, yy + 12, w, 20, { font: `400 14px ${FONT.mono}`, color: INK.muted });
}

function drawCodes(ctx, flavor, x, top, w = 380) {
  text(ctx, 'NØX ENERGY CO.', x, top + 26, { font: `600 22px ${FONT.sans}`, color: INK.text, spacing: 1 });
  text(ctx, 'Indústria Brasileira · São Paulo, SP', x, top + 52, { font: `400 15px ${FONT.sans}`, color: INK.soft });

  drawBarcode(ctx, flavor.ean, x, top + 78, w);

  // Lote e validade em jato de tinta
  ctx.fillStyle = INK.soft;
  const lot = flavor.code.replace('-', '');
  ['LOTE ' + lot + '-2610A', 'FAB 10/2026', 'VAL 10/2027'].forEach((line, i) => drawDotMatrix(ctx, line, x, top + 306 + i * 38, 3.6));
}

function drawDisposal(ctx, x, top) {
  drawRecycle(ctx, x + 46, top + 46, 42, INK.soft);
  text(ctx, 'ALU 41', x + 46, top + 118, { font: `500 14px ${FONT.mono}`, color: INK.muted, spacing: 3, align: 'center' });
  text(ctx, 'ALUMÍNIO', x + 118, top + 30, { font: `600 20px ${FONT.sans}`, color: INK.text, spacing: 2 });
  text(ctx, '100% reciclável, infinitas vezes.', x + 118, top + 56, { font: `400 15px ${FONT.sans}`, color: INK.soft });
  text(ctx, 'Descarte na coleta seletiva.', x + 118, top + 78, { font: `400 15px ${FONT.sans}`, color: INK.soft });

  text(ctx, 'CONTEÚDO', x, top + 196, { font: `500 14px ${FONT.mono}`, color: INK.muted, spacing: 3 });
  text(ctx, '473 mL', x, top + 248, { font: `600 46px ${FONT.sans}`, color: INK.text });
}

function drawBarcode(ctx, digits, x, top, w) {
  const code = ean13(digits);
  const bits = ean13Modules(code);
  const m = 3; // largura de um módulo, em px
  const quiet = 11; // margem silenciosa à esquerda exigida pelo padrão
  const h = 204;
  ctx.fillStyle = '#ECEEE8';
  ctx.beginPath();
  ctx.roundRect(x, top, w, h, 6);
  ctx.fill();

  const ox = x + (w - (quiet + 95 + 7) * m) / 2 + quiet * m;
  ctx.fillStyle = '#0A0B0A';
  for (let i = 0; i < 95; i++) {
    if (bits[i] !== '1') continue;
    const guard = i < 3 || (i >= 45 && i < 50) || i >= 92;
    ctx.fillRect(ox + i * m, top + 18, m, guard ? 154 : 138);
  }
  const digit = { font: `500 24px ${FONT.mono}`, color: '#0A0B0A', align: 'center' };
  text(ctx, code[0], ox - 4, top + 186, { ...digit, align: 'right' });
  for (let k = 0; k < 6; k++) {
    text(ctx, code[1 + k], ox + (3 + 7 * k + 3.5) * m, top + 186, digit);
    text(ctx, code[7 + k], ox + (50 + 7 * k + 3.5) * m, top + 186, digit);
  }
}

// Símbolo de reciclagem: três setas que se perseguem formando um triângulo.
function drawRecycle(ctx, cx, cy, r, color) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.strokeStyle = ctx.fillStyle = color;
  ctx.lineWidth = r * 0.17;
  ctx.lineCap = ctx.lineJoin = 'round';
  const v = [0, 1, 2].map((i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
  for (let i = 0; i < 3; i++) {
    const [ax, ay] = v[i];
    const [bx, by] = v[(i + 1) % 3];
    const [px, py] = v[(i + 2) % 3];
    const len = Math.hypot(bx - ax, by - ay);
    const [ux, uy] = [(bx - ax) / len, (by - ay) / len];
    // Cada seta dobra a quina de onde sai, como no símbolo original.
    const corner = [ax + (px - ax) * 0.1, ay + (py - ay) * 0.1];
    const end = [ax + (bx - ax) * 0.64, ay + (by - ay) * 0.64];
    ctx.beginPath();
    ctx.moveTo(corner[0], corner[1]);
    ctx.quadraticCurveTo(ax, ay, ax + (bx - ax) * 0.14, ay + (by - ay) * 0.14);
    ctx.lineTo(end[0], end[1]);
    ctx.stroke();
    const head = r * 0.34;
    ctx.beginPath();
    ctx.moveTo(end[0] + ux * head, end[1] + uy * head);
    ctx.lineTo(end[0] - uy * head * 0.62, end[1] + ux * head * 0.62);
    ctx.lineTo(end[0] + uy * head * 0.62, end[1] - ux * head * 0.62);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// Tinta neon: aparece no mapa de cor e no de emissão, com borda seca, sem halo.
function drawInk(ctx, flavor) {
  const accent = flavor.accent;
  ctx.save();
  ctx.fillStyle = ctx.strokeStyle = accent;

  // Filete na divisa entre ombro e corpo
  ctx.fillRect(0, SHOULDER - 2, W, 3);

  // Marca, com tracking levemente fechado
  ctx.font = `800 100px ${FONT.brand}`;
  ctx.letterSpacing = '0px';
  const size = Math.round((100 * FRONT_W) / (ctx.measureText('NØX').width * 0.97));
  text(ctx, 'NØX', FRONT, y(0.33), { font: `800 ${size}px ${FONT.brand}`, color: accent, spacing: -size * 0.015, align: 'center' });

  // Onda: desenhada também deslocada uma volta, para a quina da emenda não sair pela metade.
  const points = wavePoints(flavor.wave, { width: W, cycles: flavor.hz / 22, amplitude: WAVE.amplitude });
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const offset of [-W, 0]) {
    ctx.beginPath();
    points.forEach(([px, py], i) => (i ? ctx.lineTo(px + offset, WAVE.y - py) : ctx.moveTo(px + offset, WAVE.y - py)));
    ctx.stroke();
  }

  text(ctx, `${flavor.hz} HZ`, FRONT - FRONT_W / 2, WAVE.y - 80, { font: `500 26px ${FONT.mono}`, color: accent, spacing: 2 });

  // Anel do selo, com marcações como um mostrador
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(SEAL.x, SEAL.y, SEAL.r, 0, Math.PI * 2);
  ctx.stroke();
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const inner = SEAL.r + (i % 4 ? 5 : 3);
    ctx.lineWidth = i % 4 ? 1.5 : 2.5;
    ctx.beginPath();
    ctx.moveTo(SEAL.x + Math.cos(a) * inner, SEAL.y + Math.sin(a) * inner);
    ctx.lineTo(SEAL.x + Math.cos(a) * (SEAL.r + 12), SEAL.y + Math.sin(a) * (SEAL.r + 12));
    ctx.stroke();
  }
  ctx.restore();
}

// Texto com tracking em px. Mede sem o espaçamento e alinha à mão: assim a posição
// fica certa mesmo em navegadores sem ctx.letterSpacing (o texto só sai mais justo).
function text(ctx, str, x, yy, { font, color, align = 'left', spacing = 0, baseline = 'alphabetic' }) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.textBaseline = baseline;
  ctx.letterSpacing = '0px';
  const width = ctx.measureText(str).width + spacing * (str.length - 1);
  ctx.letterSpacing = `${spacing}px`;
  const left = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  ctx.fillText(str, left, yy);
  ctx.letterSpacing = '0px';
  return width;
}

// Quebra em linhas pela largura; devolve a altura logo abaixo da última linha.
function paragraph(ctx, str, x, yy, maxWidth, lineHeight, style) {
  ctx.font = style.font;
  ctx.letterSpacing = '0px';
  let line = '';
  for (const word of str.split(' ')) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      text(ctx, line, x, yy, style);
      yy += lineHeight;
      line = word;
    } else {
      line = next;
    }
  }
  if (line) text(ctx, line, x, yy, style);
  return yy + lineHeight;
}

// Distribui os caracteres por toda a volta do círculo, começando no topo.
function textOnCircle(ctx, str, cx, cy, radius) {
  ctx.letterSpacing = '0px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const chars = [...str];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const gap = (Math.PI * 2 * radius - widths.reduce((a, b) => a + b, 0)) / chars.length;
  let angle = -Math.PI / 2;
  chars.forEach((ch, i) => {
    const a = angle + widths[i] / 2 / radius;
    ctx.save();
    ctx.translate(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    angle += (widths[i] + gap) / radius;
  });
}
