import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createCan } from './can.js';
import { CAMERA } from './camera.js';
import { FLAVORS, getFlavor } from '../flavors.js';

// Devolve a thread principal entre etapas pesadas, para não gerar uma tarefa longa única.
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));

// Renderer, câmera, luzes e lata. Rejeita se o WebGL não estiver disponível.
export async function createScene(canvas, { flavorId, isMobile, reducedMotion, fontsReady }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, 0.1, 50);
  camera.position.set(0, 0, CAMERA.z);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();
  await yieldToMain();

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);

  // O rótulo é desenhado com as fontes do site: espera por elas antes de pintar o canvas.
  await fontsReady;
  const can = createCan({ flavorId, maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
  scene.add(can.group);
  await yieldToMain();

  // Luzes de contorno e brilho na cor do sabor: presas à lata, acompanham o scroll.
  const accent = new THREE.Color(getFlavor(flavorId).accent);
  const rimLeft = new THREE.PointLight(accent, 18, 8, 1.5);
  rimLeft.position.set(-1.6, 0.8, -1.2);
  const rimRight = new THREE.PointLight(accent, 12, 8, 1.5);
  rimRight.position.set(1.6, -0.6, -1.2);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({
      map: radialTexture(),
      color: accent,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.z = -1.2;
  can.group.add(rimLeft, rimRight, glow);

  const pointer = { x: 0, y: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    });
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  const idle = !reducedMotion;
  const halfHeight = CAMERA.z * Math.tan((CAMERA.fov * Math.PI) / 360);
  let drawnOffscreen = false;
  function render() {
    can.update(clock.getElapsedTime(), { pointer, idle });
    // Com a lata (e o halo de 2.5 de raio) fora da tela, desenha um último frame vazio e para.
    const { position, scale } = can.group;
    const reach = 2.5 * scale.y;
    const offscreen = Math.abs(position.y) - reach > halfHeight || Math.abs(position.x) - reach > halfHeight * camera.aspect;
    if (offscreen && drawnOffscreen) return;
    drawnOffscreen = offscreen;
    renderer.render(scene, camera);
  }

  // Retângulo da lata na tela, em px (sem o halo). Usado para auditar colisão com o texto.
  const box = new THREE.Box3();
  const corner = new THREE.Vector3();
  function canRect() {
    box.setFromObject(can.spinner, true); // preciso: percorre os vértices, não a caixa girada
    const xs = [];
    const ys = [];
    for (let i = 0; i < 8; i++) {
      corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).project(camera);
      xs.push(((corner.x + 1) / 2) * innerWidth);
      ys.push(((1 - corner.y) / 2) * innerHeight);
    }
    return { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
  }
  renderer.setAnimationLoop(render);
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : render));

  let current = flavorId;
  const order = (id) => FLAVORS.findIndex((f) => f.id === id);
  function setFlavor(id) {
    if (id === current) return Promise.resolve();
    // Gira para a frente ao avançar na lista e para trás ao voltar.
    const direction = order(id) > order(current) ? 1 : -1;
    current = id;
    const target = new THREE.Color(getFlavor(id).accent);
    const colors = [rimLeft.color, rimRight.color, glow.material.color];

    if (reducedMotion) {
      can.setLabel(id);
      colors.forEach((c) => c.copy(target));
      return Promise.resolve();
    }

    // Giro de 360°; o rótulo troca na metade, quando a frente está de costas para a câmera.
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(can.flavorSpin, { value: `+=${Math.PI * 2 * direction}`, duration: 0.9, ease: 'power3.inOut' }, 0);
      tl.call(() => can.setLabel(id), null, 0.45);
      colors.forEach((c) => tl.to(c, { r: target.r, g: target.g, b: target.b, duration: 0.5, ease: 'power2.out' }, 0.3));
    });
  }

  return { can, setFlavor, canRect };
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
