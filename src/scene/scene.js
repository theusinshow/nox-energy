import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createCan } from './can.js';
import { CAMERA } from './camera.js';
import { FLAVORS } from '../flavors.js';

// Devolve a thread principal entre etapas pesadas, para não gerar uma tarefa longa única.
const yieldToMain = () => new Promise((resolve) => setTimeout(resolve, 0));
const TURN = Math.PI * 2;

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

  // Luzes de contorno neutras, presas à lata: desenham a silhueta sem tingir o fundo.
  const rimLeft = new THREE.PointLight(0xdfe6ee, 10, 8, 1.5);
  rimLeft.position.set(-1.6, 0.8, -1.2);
  const rimRight = new THREE.PointLight(0xdfe6ee, 6, 8, 1.5);
  rimRight.position.set(1.6, -0.6, -1.2);
  can.group.add(rimLeft, rimRight);

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

  const idle = !reducedMotion;
  const halfHeight = CAMERA.z * Math.tan((CAMERA.fov * Math.PI) / 360);
  let drawnOffscreen = false;
  function render() {
    can.update({ pointer, idle });
    // Com a lata fora da tela (1.4 cobre a altura e a inclinação), desenha um último frame vazio e para.
    const { position, scale } = can.group;
    const reach = 1.4 * scale.y;
    const offscreen = Math.abs(position.y) - reach > halfHeight || Math.abs(position.x) - reach > halfHeight * camera.aspect;
    if (offscreen && drawnOffscreen) return;
    drawnOffscreen = offscreen;
    renderer.render(scene, camera);
  }

  // Retângulo da lata na tela, em px. Usado para auditar colisão com o texto.
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

    if (reducedMotion) {
      can.setLabel(id);
      return Promise.resolve();
    }

    // O giro do arraste passa para o da troca, sem mudar o ângulo visível; assim a volta
    // termina num múltiplo exato de 360°, com a frente (e o nome novo) para a câmera.
    const spin = can.flavorSpin;
    spin.value += can.drag.spin;
    can.drag.spin = 0;
    can.drag.velocity = 0;
    const from = spin.value;
    // Pelo menos 3/4 de volta no sentido do giro, para a troca de rótulo ficar escondida.
    const to = direction > 0 ? Math.ceil((from + TURN * 0.75) / TURN) * TURN : Math.floor((from - TURN * 0.75) / TURN) * TURN;
    const backFacing = to - direction * Math.PI;
    let swapped = false;
    const swap = () => {
      if (swapped) return;
      swapped = true;
      can.setLabel(id);
    };

    return new Promise((resolve) => {
      gsap.to(spin, {
        value: to,
        duration: 0.9,
        ease: 'power3.inOut',
        // O rótulo troca quando a frente passa de costas para a câmera.
        onUpdate: () => direction * (spin.value - backFacing) >= 0 && swap(),
        onComplete: () => {
          swap();
          resolve();
        },
      });
    });
  }

  return { can, setFlavor, canRect };
}

