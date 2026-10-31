import * as THREE from 'three';
import { CAN, bottomProfile, topProfile, bodyHeight } from './profile.js';
import { getLabelTexture } from './label.js';

// A lata separa três fontes de movimento para que não briguem entre si:
// pose (scroll), intro (entrada) e flavorSpin (troca de sabor). update() soma tudo.
export function createCan({ flavorId, maxAnisotropy }) {
  const group = new THREE.Group(); // posição, escala e inclinação
  const spinner = new THREE.Group(); // giro no eixo Y
  group.add(spinner);

  const label = getLabelTexture(flavorId, maxAnisotropy);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: label,
    emissiveMap: label, // as partes neon do rótulo "acendem"
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(CAN.radius, CAN.radius, bodyHeight(), 64, 1, true, Math.PI),
    bodyMat,
  );
  body.position.y = (CAN.bodyTop + CAN.bodyBottom) / 2;

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd2,
    metalness: 1,
    roughness: 0.28,
    side: THREE.DoubleSide,
  });
  const lathe = (points) =>
    new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 64), metalMat);

  spinner.add(body, lathe(bottomProfile()), lathe(topProfile()), createTab(metalMat));

  const pose = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, scale: 1 };
  const intro = { y: 0, spin: 0 };
  const flavorSpin = { value: 0 };
  const tilt = { x: 0, y: 0 };

  function setLabel(id) {
    const texture = getLabelTexture(id, maxAnisotropy);
    bodyMat.map = texture;
    bodyMat.emissiveMap = texture;
  }

  function update(time, { pointer, idle }) {
    tilt.x += ((idle ? pointer.y * 0.18 : 0) - tilt.x) * 0.06;
    tilt.y += ((idle ? pointer.x * 0.25 : 0) - tilt.y) * 0.06;
    const float = idle ? Math.sin(time * 1.3) * 0.05 : 0;

    group.position.set(pose.x, pose.y + intro.y + float, pose.z);
    group.scale.setScalar(pose.scale);
    group.rotation.set(pose.rotX + tilt.x, 0, tilt.y * 0.3);
    spinner.rotation.y = pose.rotY + intro.spin + flavorSpin.value + tilt.y + (idle ? time * 0.12 : 0);
  }

  return { group, pose, intro, flavorSpin, setLabel, update };
}

function createTab(material) {
  const shape = new THREE.Shape();
  roundedRect(shape, -0.11, -0.07, 0.22, 0.14, 0.06);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.015, 0.045, 0.03, 0, Math.PI * 2, false, 0);
  shape.holes.push(hole);

  const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), material);
  tab.rotation.x = -Math.PI / 2;
  tab.position.set(0, 1.12, 0.12);
  return tab;
}

function roundedRect(s, x, y, w, h, r) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
}
