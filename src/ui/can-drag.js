import gsap from 'gsap';

const TURN = Math.PI * 2;
const SPIN_PER_PX = 0.012; // ~520px de arraste dão uma volta inteira
const MAX_VELOCITY = 0.5; // rad por quadro de 60 Hz
// Mola amortecida que leva a lata de volta à frente depois de soltar (por quadro de 60 Hz).
const SPRING = 0.012;
const DAMPING = 0.2;
const INTERACTIVE = 'a, button, input, label, select, textarea, summary, [role="button"]';

// Arrastar a lata na horizontal gira ela no próprio eixo; ao soltar, o giro segue com a
// velocidade do gesto e assenta de frente, na volta inteira mais próxima de onde pararia.
// O canvas não recebe eventos (fica atrás do conteúdo), então o acerto é feito pelo
// retângulo da lata na tela.
export function initCanDrag({ can, canRect }, { reducedMotion }) {
  const root = document.documentElement;
  let drag = null; // { id, x, t }
  const state = can.drag; // spin, lean e velocity (zerada pela troca de sabor)

  function overCan(e) {
    if (e.target.closest?.(INTERACTIVE)) return false;
    const r = canRect();
    // A lata é estreita: 12px de folga nas laterais facilitam pegar pela borda.
    return e.clientX > r.left - 12 && e.clientX < r.right + 12 && e.clientY > r.top && e.clientY < r.bottom;
  }

  addEventListener('pointerdown', (e) => {
    if (drag || e.button !== 0 || !overCan(e)) return;
    drag = { id: e.pointerId, x: e.clientX, t: e.timeStamp };
    state.velocity = 0;
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
      state.spin += delta;
      state.velocity = gsap.utils.clamp(-MAX_VELOCITY, MAX_VELOCITY, delta / frames);
      drag.x = e.clientX;
      drag.t = e.timeStamp;
    },
    { passive: true },
  );

  // No toque, um gesto vertical vira rolagem e chega aqui como pointercancel.
  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    // Parou antes de soltar: não sai girando.
    if (reducedMotion || e.timeStamp - drag.t > 80) state.velocity = 0;
    drag = null;
    root.classList.remove('is-dragging-can');
  }
  addEventListener('pointerup', release);
  addEventListener('pointercancel', release);

  gsap.ticker.add((time, deltaTime) => {
    const frames = deltaTime / 16.67;
    if (drag) {
      if (performance.now() - drag.t > 80) state.velocity = 0; // segurando parado
    } else if (state.spin || state.velocity) {
      // Alvo: a frente mais próxima de onde o giro pararia sozinho.
      const front = Math.round((state.spin + state.velocity / DAMPING) / TURN) * TURN;
      state.velocity += (front - state.spin) * SPRING * frames;
      state.velocity *= (1 - DAMPING) ** frames;
      state.spin += state.velocity * frames;
      if (Math.abs(front - state.spin) < 0.001 && Math.abs(state.velocity) < 0.0005) {
        // Assentou: zera a volta inteira para os números não crescerem sem fim.
        state.spin = 0;
        state.velocity = 0;
      }
    }
    // Inclina de leve para o lado do giro, como quem empurra a lata.
    const lean = reducedMotion ? 0 : gsap.utils.clamp(-0.12, 0.12, -state.velocity * 0.6);
    state.lean += (lean - state.lean) * Math.min(1, 0.15 * frames);
  });
}
