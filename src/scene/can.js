import * as THREE from 'three';
import { CAN, bottomProfile, bodyProfile, lidProfile, arcLengths } from './profile.js';
import { getLabelTextures, getSurfaceTexture } from './label.js';
import { getFlavor } from '../flavors.js';

const SEGMENTS = 64;

// A lata separa três fontes de movimento para que não briguem entre si:
// pose (scroll), intro (entrada), flavorSpin (troca de sabor) e drag (arraste). update() soma tudo.
// Sem giro ocioso: parada, a lata fica de frente e só se move quando algo a move.
export function createCan({ flavorId, maxAnisotropy }) {
  const group = new THREE.Group(); // posição, escala e inclinação
  const spinner = new THREE.Group(); // giro no eixo Y
  group.add(spinner);

  // Corpo impresso do pé ao gargalo. Mapas de rugosidade/metal deixam o alumínio
  // aparecer onde não há tinta; a emissão vem só da tinta neon.
  const label = getLabelTextures(flavorId, maxAnisotropy);
  const surface = getSurfaceTexture(maxAnisotropy);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: label.map,
    emissiveMap: label.emissiveMap,
    emissive: 0xffffff,
    emissiveIntensity: 0.4,
    metalnessMap: surface,
    roughnessMap: surface,
    metalness: 1,
    roughness: 1,
    clearcoat: 0.55,
    clearcoatRoughness: 0.28,
  });
  const body = new THREE.Mesh(printedLathe(bodyProfile()), bodyMat);

  // Alumínio estampado: o brilho se estica no sentido radial, como em peça torneada.
  const metalMat = new THREE.MeshPhysicalMaterial({
    color: 0xc9cdd2,
    metalness: 1,
    roughness: 0.32,
    anisotropy: 0.6,
    anisotropyRotation: Math.PI / 2,
    side: THREE.DoubleSide,
  });
  const lathe = (points) =>
    new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), SEGMENTS), metalMat);

  // Anel anodizado na cor do sabor, como nas latas de edição especial.
  const tabMat = new THREE.MeshPhysicalMaterial({ color: getFlavor(flavorId).accent, metalness: 1, roughness: 0.34 });

  spinner.add(body, lathe(bottomProfile()), lathe(lidProfile()), createLidPanel(), createTab(tabMat), createRivet(metalMat));

  const pose = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, scale: 1 };
  const intro = { y: 0, spin: 0 };
  const flavorSpin = { value: 0 };
  const drift = { lean: 0, spin: 0 }; // inércia da rolagem, escrita pelo motion
  const drag = { spin: 0, lean: 0, velocity: 0 }; // giro com o mouse ou o dedo, escrito por ui/can-drag.js
  const tilt = { x: 0, y: 0 };

  function setLabel(id) {
    const next = getLabelTextures(id, maxAnisotropy);
    bodyMat.map = next.map;
    bodyMat.emissiveMap = next.emissiveMap;
    tabMat.color.set(getFlavor(id).accent);
  }

  function update({ pointer, idle }) {
    tilt.x += ((idle ? pointer.y * 0.18 : 0) - tilt.x) * 0.06;
    tilt.y += ((idle ? pointer.x * 0.25 : 0) - tilt.y) * 0.06;
    group.position.set(pose.x, pose.y + intro.y, pose.z);
    group.scale.setScalar(pose.scale);
    group.rotation.set(pose.rotX + tilt.x, 0, tilt.y * 0.3 + drift.lean + drag.lean);
    spinner.rotation.y = pose.rotY + intro.spin + flavorSpin.value + drift.spin + drag.spin + tilt.y;
  }

  return { group, spinner, pose, intro, flavorSpin, drift, drag, setLabel, update };
}

// Torno com phiStart = PI (u = 0.5 de frente para a câmera) e v pelo comprimento de arco,
// para o rótulo subir pelo ombro sem esticar.
function printedLathe(profile) {
  const geometry = new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), SEGMENTS, Math.PI);
  const v = arcLengths(profile);
  const uv = geometry.attributes.uv;
  for (let i = 0; i < uv.count; i++) uv.setY(i, v[i % profile.length]);
  return geometry;
}

// Painel da tampa: relevo (canal R) e rugosidade em anéis de torno (canal G) num só canvas.
// No canvas, o topo é o fundo da lata (-z) e a base é a frente (+z), onde fica a abertura.
function createLidPanel() {
  const S = 512;
  const R = CAN.lidPanelRadius;
  const k = S / 2 / R;
  const c = S / 2;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = 'rgb(128, 0, 0)';
  ctx.fillRect(0, 0, S, S);
  ring(ctx, c, 0.33 * k, 9, 'rgb(190, 0, 0)'); // nervura de reforço
  ring(ctx, c, 0.312 * k, 3, 'rgb(150, 0, 0)');
  ring(ctx, c, 0.034 * k, 6, 'rgb(176, 0, 0)'); // base do rebite

  // Abertura em gota, com a linha de corte (score) mais funda
  const tear = new Path2D();
  tear.moveTo(c, c + 0.052 * k);
  tear.bezierCurveTo(c + 0.085 * k, c + 0.058 * k, c + 0.128 * k, c + 0.17 * k, c + 0.116 * k, c + 0.236 * k);
  tear.quadraticCurveTo(c + 0.1 * k, c + 0.298 * k, c, c + 0.298 * k);
  tear.quadraticCurveTo(c - 0.1 * k, c + 0.298 * k, c - 0.116 * k, c + 0.236 * k);
  tear.bezierCurveTo(c - 0.128 * k, c + 0.17 * k, c - 0.085 * k, c + 0.058 * k, c, c + 0.052 * k);
  ctx.fillStyle = 'rgb(116, 0, 0)';
  ctx.fill(tear);
  ctx.strokeStyle = 'rgb(36, 0, 0)';
  ctx.lineWidth = 3;
  ctx.stroke(tear);

  // Cavidade para o dedo atrás do anel
  const well = ctx.createRadialGradient(c, c - 0.2 * k, 0, c, c - 0.2 * k, 0.08 * k);
  well.addColorStop(0, 'rgb(92, 0, 0)');
  well.addColorStop(1, 'rgb(128, 0, 0)');
  ctx.fillStyle = well;
  ctx.beginPath();
  ctx.ellipse(c, c - 0.2 * k, 0.08 * k, 0.055 * k, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgb(168, 0, 0)';
  ctx.font = '800 30px Unbounded';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('NØX', c, c - 0.29 * k);

  // Rugosidade somada por cima: base 0.3 e anéis finos de torno
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgb(0, 76, 0)';
  ctx.fillRect(0, 0, S, S);
  let seed = 7;
  for (let r = 3; r < c; r += 2.5) {
    seed = (seed * 16807) % 2147483647;
    ring(ctx, c, r, 1.2, `rgb(0, ${Math.round((seed / 2147483647) * 26)}, 0)`);
  }

  const texture = new THREE.CanvasTexture(canvas);
  const panel = new THREE.Mesh(
    new THREE.CircleGeometry(R, SEGMENTS),
    new THREE.MeshPhysicalMaterial({
      color: 0xaeb3b9,
      metalness: 1,
      roughness: 1,
      roughnessMap: texture,
      bumpMap: texture,
      bumpScale: 2,
    }),
  );
  panel.rotation.x = -Math.PI / 2;
  panel.position.y = CAN.lidPanelY;
  return panel;
}

function ring(ctx, c, r, width, color) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.stroke();
}

// Anel de abertura: bico sobre a gota (+z), furo para o dedo do lado oposto.
// No Shape, y aponta para -z depois da rotação.
function createTab(material) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.044, -0.088);
  shape.lineTo(0.044, -0.088);
  shape.quadraticCurveTo(0.07, -0.088, 0.072, -0.062);
  shape.lineTo(0.079, 0.168);
  shape.quadraticCurveTo(0.081, 0.214, 0.036, 0.214);
  shape.lineTo(-0.036, 0.214);
  shape.quadraticCurveTo(-0.081, 0.214, -0.079, 0.168);
  shape.lineTo(-0.072, -0.062);
  shape.quadraticCurveTo(-0.07, -0.088, -0.044, -0.088);

  const hole = new THREE.Path();
  hole.moveTo(-0.03, 0.062);
  hole.lineTo(0.03, 0.062);
  hole.quadraticCurveTo(0.053, 0.062, 0.053, 0.088);
  hole.lineTo(0.053, 0.156);
  hole.quadraticCurveTo(0.053, 0.186, 0.026, 0.186);
  hole.lineTo(-0.026, 0.186);
  hole.quadraticCurveTo(-0.053, 0.186, -0.053, 0.156);
  hole.lineTo(-0.053, 0.088);
  hole.quadraticCurveTo(-0.053, 0.062, -0.03, 0.062);
  shape.holes.push(hole);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.0025,
    bevelSize: 0.0025,
    bevelSegments: 2,
    curveSegments: 12,
  });
  const tab = new THREE.Mesh(geometry, material);
  tab.rotation.x = -Math.PI / 2;
  tab.position.y = CAN.lidPanelY + 0.006;
  return tab;
}

function createRivet(material) {
  const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.023, 0.01, 24), material);
  rivet.position.y = CAN.lidPanelY + 0.017;
  return rivet;
}
