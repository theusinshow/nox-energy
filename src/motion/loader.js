import gsap from 'gsap';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const SAMPLE = 400; // tamanho da fonte no canvas de medição, em px

// Cortina de entrada: tela cinza com a marca, cortada na linha da barra do Ø.
// As duas metades se afastam na perpendicular do corte e revelam o hero.
// Resolve quando a abertura começa; o elemento sai do DOM quando ela termina.
export async function openLoader(loader, { reducedMotion, ready }) {
  if (!loader) return;
  if (reducedMotion) {
    loader.remove();
    return;
  }

  const root = document.documentElement;
  root.classList.add('is-loading');
  const [first, second] = loader.querySelectorAll('.loader__half');
  const cut = loader.querySelector('.loader__cut');
  const letters = loader.querySelectorAll('.loader__logo span');
  await gsap.fromTo(letters, { y: 0, yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out' });

  // Medida com as letras já no lugar: o retângulo do Ø inclui o transform.
  const slash = measureSlash(first.querySelector('.loader__logo span:nth-child(2)'));
  let travel;
  const fit = () => {
    travel = fitToSlash(slash(), { first, second, cut });
  };
  fit();
  addEventListener('resize', fit);
  await Promise.all([ready, wait(350)]);

  const tl = gsap.timeline({
    onComplete: () => {
      removeEventListener('resize', fit);
      loader.remove();
      root.classList.remove('is-loading');
    },
  });
  // O corte nasce na barra do Ø e corre até as bordas.
  tl.fromTo(cut, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'power3.inOut' });
  tl.set(loader, { background: 'transparent' }, 'open');
  tl.to(first, { x: () => travel.first.x, y: () => travel.first.y, duration: 1.1, ease: 'expo.inOut' }, 'open');
  tl.to(second, { x: () => travel.second.x, y: () => travel.second.y, duration: 1.1, ease: 'expo.inOut' }, 'open');
  tl.to(cut, { opacity: 0, duration: 0.2, ease: 'none' }, 'open');
  await new Promise((resolve) => tl.call(resolve, null, 'open+=0.15'));
}

// Lê a barra do Ø na própria fonte, num canvas fora da tela. Devolve uma função que
// converte a medida para a posição atual do glifo na tela.
function measureSlash(glyph) {
  const style = getComputedStyle(glyph);
  const font = `${style.fontWeight} ${SAMPLE}px ${style.fontFamily}`;
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  ctx.font = font;
  const m = ctx.measureText('Ø');
  const pad = 20;
  const w = Math.ceil(m.width + pad * 2);
  const baseline = Math.ceil(m.actualBoundingBoxAscent + pad);
  const h = Math.ceil(baseline + m.actualBoundingBoxDescent + pad);
  const draw = (glyphText) => {
    ctx.canvas.width = w; // também limpa o canvas
    ctx.canvas.height = h;
    ctx.font = font;
    ctx.fillText(glyphText, pad, baseline);
    return ctx.getImageData(0, 0, w, h).data;
  };
  const slashed = draw('Ø');
  const ring = draw('O');

  // Ø menos O deixa só a barra. Centro e direção saem dos momentos desses pixels
  // (eixo principal), então pontas, miolo e espessura entram todos na conta.
  let count = 0;
  let sx = 0;
  let sy = 0;
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4 + 3;
      if (slashed[i] > 128 && ring[i] < 64) {
        count++;
        sx += x;
        sy += y;
        sxx += x * x;
        syy += y * y;
        sxy += x * y;
      }
    }
  }
  let tip = null;
  let foot = null;
  if (count > 50) {
    const cx = sx / count;
    const cy = sy / count;
    const vxx = sxx / count - cx * cx;
    const vyy = syy / count - cy * cy;
    const vxy = sxy / count - cx * cy;
    const theta = 0.5 * Math.atan2(2 * vxy, vxx - vyy);
    // Dois pontos na linha central; `tip` fica acima de `foot`.
    const dx = Math.cos(theta) * 100;
    const dy = Math.sin(theta) * 100;
    [tip, foot] = dy < 0 ? [{ x: cx + dx, y: cy + dy }, { x: cx - dx, y: cy - dy }] : [{ x: cx - dx, y: cy - dy }, { x: cx + dx, y: cy + dy }];
  }
  const ascent = m.fontBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent;

  return () => {
    const rect = glyph.getBoundingClientRect();
    const size = parseFloat(getComputedStyle(glyph).fontSize);
    const k = size / SAMPLE;
    // line-height 1: a meia-entrelinha fica acima do ascendente.
    const baselineY = rect.top + (size - (ascent + descent) * k) / 2 + ascent * k;
    const toScreen = (p) => ({ x: rect.left + (p.x - pad) * k, y: baselineY + (p.y - baseline) * k });
    if (!tip) {
      // Sem leitura da fonte: cai na diagonal da tela pelo centro do glifo.
      return { center: { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }, angle: -Math.atan2(innerHeight, innerWidth) };
    }
    const a = toScreen(foot);
    const b = toScreen(tip);
    return { center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, angle: Math.atan2(b.y - a.y, b.x - a.x) };
  };
}

// Recorta as metades na linha da barra e calcula quanto cada uma anda para sair da tela.
function fitToSlash({ center: p, angle }, { first, second, cut }) {
  const d = { x: Math.cos(angle), y: Math.sin(angle) };
  const n = { x: -d.y, y: d.x }; // normal: aponta para o lado da segunda metade
  const far = Math.hypot(innerWidth, innerHeight) * 2;
  const pt = (base, along, across) => `${base.x + d.x * along + n.x * across}px ${base.y + d.y * along + n.y * across}px`;
  // A primeira passa 2px do corte e cobre a borda da segunda.
  const edge = { x: p.x + n.x * 2, y: p.y + n.y * 2 };
  first.style.clipPath = `polygon(${pt(edge, -far, 0)}, ${pt(edge, far, 0)}, ${pt(edge, far, -far)}, ${pt(edge, -far, -far)})`;
  second.style.clipPath = `polygon(${pt(p, -far, 0)}, ${pt(p, far, 0)}, ${pt(p, far, far)}, ${pt(p, -far, far)})`;

  // Distância do corte até o canto mais longe de cada lado.
  const corners = [[0, 0], [innerWidth, 0], [0, innerHeight], [innerWidth, innerHeight]];
  const side = corners.map(([x, y]) => (x - p.x) * n.x + (y - p.y) * n.y);
  const toFirst = Math.max(0, ...side.map((s) => -s)) + 8;
  const toSecond = Math.max(0, ...side) + 8;

  gsap.set(cut, {
    x: p.x,
    y: p.y,
    xPercent: -50,
    yPercent: -50,
    width: far,
    rotation: (angle * 180) / Math.PI,
  });
  return {
    first: { x: -n.x * toFirst, y: -n.y * toFirst },
    second: { x: n.x * toSecond, y: n.y * toSecond },
  };
}
