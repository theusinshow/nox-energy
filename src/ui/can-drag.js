import gsap from 'gsap';

const SPIN_PER_PX = 0.012; // ~520px de arraste dão uma volta inteira
const MAX_VELOCITY = 0.5; // rad por quadro de 60 Hz
const FRICTION = 0.94; // fração do giro que sobra a cada quadro depois de soltar
const INTERACTIVE = 'a, button, input, label, select, textarea, summary, [role="button"]';

// Arrastar a lata na horizontal gira ela no próprio eixo; ao soltar, o giro segue com a
// velocidade do gesto e perde força aos poucos. O canvas não recebe eventos (fica atrás do
// conteúdo), então o acerto é feito pelo retângulo da lata na tela.
export function initCanDrag({ can, canRect }, { reducedMotion }) {
  const root = document.documentElement;
  let drag = null; // { id, x, t }
  let velocity = 0;

  function overCan(e) {
    if (e.target.closest?.(INTERACTIVE)) return false;
    const r = canRect();
    // A lata é estreita: 12px de folga nas laterais facilitam pegar pela borda.
    return e.clientX > r.left - 12 && e.clientX < r.right + 12 && e.clientY > r.top && e.clientY < r.bottom;
  }

  addEventListener('pointerdown', (e) => {
    if (drag || e.button !== 0 || !overCan(e)) return;
    drag = { id: e.pointerId, x: e.clientX, t: e.timeStamp };
    velocity = 0;
    root.classList.add('is-dragging-can');
    if (e.pointerType === 'mouse') e.preventDefault(); // evita selecionar texto no caminho
  });

  addEventListener(
    'pointermove',
    (e) => {
      if (!drag) {
        if (e.pointerType === 'mouse') root.classList.toggle('can-grab', overCan(e));
        return;
      }
      if (e.pointerId !== drag.id) return;
      const delta = (e.clientX - drag.x) * SPIN_PER_PX;
      const frames = Math.max(1, e.timeStamp - drag.t) / 16.67;
      can.drag.spin += delta;
      velocity = gsap.utils.clamp(-MAX_VELOCITY, MAX_VELOCITY, delta / frames);
      drag.x = e.clientX;
      drag.t = e.timeStamp;
    },
    { passive: true },
  );

  // No toque, um gesto vertical vira rolagem e chega aqui como pointercancel.
  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    // Parou antes de soltar: não sai girando.
    if (reducedMotion || e.timeStamp - drag.t > 80) velocity = 0;
    drag = null;
    root.classList.remove('is-dragging-can');
  }
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  gsap.ticker.add((time, deltaTime) => {
    const frames = deltaTime / 16.67;
    if (drag) {
      if (performance.now() - drag.t > 80) velocity = 0; // segurando parado
    } else if (velocity) {
      can.drag.spin += velocity * frames;
      velocity *= FRICTION ** frames;
      if (Math.abs(velocity) < 0.0005) velocity = 0;
    }
    // Inclina de leve para o lado do giro, como quem empurra a lata.
    const lean = reducedMotion ? 0 : gsap.utils.clamp(-0.12, 0.12, -velocity * 0.6);
    can.drag.lean += (lean - can.drag.lean) * Math.min(1, 0.15 * frames);
  });
}
