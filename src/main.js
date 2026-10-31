import './styles/main.css';
import { DEFAULT_FLAVOR } from './flavors.js';
import { createScene } from './scene/scene.js';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 768px)').matches;

// O rótulo é desenhado em canvas: sem as fontes carregadas ele sairia com a fonte do sistema.
async function loadFonts() {
  const fonts = ['800 100px Unbounded', '600 72px Manrope', '500 34px "JetBrains Mono"', '400 26px "JetBrains Mono"'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]);
}

async function boot() {
  await loadFonts();

  let scene = null;
  try {
    scene = createScene(document.getElementById('scene'), { flavorId: DEFAULT_FLAVOR, isMobile, reducedMotion });
  } catch (err) {
    console.warn('WebGL indisponível, usando a lata em CSS.', err);
    root.classList.add('no-webgl');
  }

  root.classList.add('is-ready');
  return scene;
}

boot();
