import './styles/main.css';
import { DEFAULT_FLAVOR } from './flavors.js';
import { playIntro, playCanEntrance } from './motion/intro.js';
import { initMotion } from './motion/scroll.js';
import { initFlavorPicker } from './ui/flavor-picker.js';
import { initNewsletter } from './ui/newsletter.js';
import { initNav } from './ui/nav.js';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 768px)').matches;

// O rótulo é desenhado em canvas: sem as fontes carregadas ele sairia com a fonte do sistema.
async function loadFonts() {
  const fonts = [
    '800 100px Unbounded',
    '400 16px Manrope',
    '600 72px Manrope',
    '400 26px "JetBrains Mono"',
    '500 34px "JetBrains Mono"',
  ];
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]);
}

// Three.js fica num chunk separado (~150 kB gzip): o texto aparece sem esperar por ele.
async function loadScene(fontsReady) {
  try {
    const { createScene } = await import('./scene/scene.js');
    return await createScene(document.getElementById('scene'), { flavorId: DEFAULT_FLAVOR, isMobile, reducedMotion, fontsReady });
  } catch (err) {
    console.warn('WebGL indisponível, usando a lata em CSS.', err);
    root.classList.add('no-webgl');
    return null;
  }
}

async function boot() {
  const fontsReady = loadFonts();
  const scenePromise = loadScene(fontsReady);
  await fontsReady;

  root.classList.add('is-ready');
  initNav(document.querySelector('.nav'), document.getElementById('menu'));
  playIntro({ reducedMotion });
  initFlavorPicker(document.querySelector('.flavor-picker'), {
    onChange: (id) => scenePromise.then((scene) => scene?.setFlavor(id)),
  });
  initNewsletter(document.querySelector('.newsletter'));

  const scene = await scenePromise;
  if (import.meta.env.DEV) window.__nox = scene; // inspeção da lata no console durante o desenvolvimento
  initMotion(scene?.can ?? null);
  if (scene) playCanEntrance(scene.can, { reducedMotion });
}

boot();
