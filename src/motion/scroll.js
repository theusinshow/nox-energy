import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { poseForRect, mixPose, easeInOutCubic } from './stage.js';

gsap.registerPlugin(ScrollTrigger);

// Palco da lata. Cada etapa aponta para um slot do layout ([data-can-slot]): uma caixa
// vazia, garantida pelo CSS sem texto por cima. A lata segue o retângulo vivo do slot,
// então rola junto com a página e nunca fica sobre o conteúdo.
// - travel: a lata viaja de um slot ao outro enquanto o próximo entra na tela (`end`
//   ajusta a janela). Só é usado onde as colunas separam lata e texto na horizontal.
// - cut: troca de slot quando os dois estão fora da tela (no celular não há coluna livre
//   para atravessar, então a lata sai com uma seção e volta com a outra).
const STAGES = {
  desktop: [
    { slot: 'hero', rotX: 0.12, rotY: 0 },
    { slot: 'specs', rotX: -0.06, rotY: Math.PI * 1.25 },
    { slot: 'flavors', rotX: 0.05, rotY: Math.PI * 2, start: 'top 60%', end: 'center 50%' },
    { slot: 'formula', rotX: 0.14, rotY: Math.PI * 2.6, start: 'top 85%', end: 'top 35%' },
  ],
  // Tablet e celular: Sabores empilhado, sem coluna livre para atravessar.
  compact: [
    { slot: 'hero', rotX: 0.12, rotY: 0 },
    { slot: 'flavors', rotX: 0.05, rotY: Math.PI * 2, cut: true },
  ],
};

export function initMotion(can) {
  const mm = gsap.matchMedia();
  // matchMedia só roda o callback quando alguma condição bate: desktop + mobile cobrem todos os casos.
  // O corte de 1100px acompanha o CSS (Sabores empilhado, slot da Fórmula escondido).
  const conditions = {
    desktop: '(min-width: 1100px)',
    compact: '(max-width: 1099px)',
    reduce: '(prefers-reduced-motion: reduce)',
  };
  mm.add(conditions, (ctx) => {
    const { compact, reduce } = ctx.conditions;
    const stages = STAGES[compact ? 'compact' : 'desktop'];

    // Movimento reduzido: canvas preso ao hero, lata parada no slot do hero.
    document.documentElement.classList.toggle('motion-reduce', reduce);
    if (reduce) {
      if (!can) return;
      const place = () => Object.assign(can.pose, staticPose(stages[0]));
      place();
      window.addEventListener('resize', place);
      return () => window.removeEventListener('resize', place);
    }

    const lenis = initSmoothScroll();
    const stage = can ? initStage(can, stages, lenis.instance) : null;
    initReveals();
    const marquee = initMarquee();

    return () => {
      lenis.destroy();
      stage?.kill();
      marquee.kill();
    };
  });
}

function slotOf(stage) {
  return document.querySelector(`[data-can-slot="${stage.slot}"]`);
}

function view() {
  return { width: innerWidth, height: innerHeight };
}

function poseOf(stage, rect) {
  return { ...poseForRect(rect, view()), rotX: stage.rotX, rotY: stage.rotY };
}

// Com o canvas preso ao topo da página, o slot é medido como se a rolagem fosse zero.
function staticPose(stage) {
  const r = slotOf(stage).getBoundingClientRect();
  return poseOf(stage, { left: r.left, top: r.top + scrollY, width: r.width, height: r.height });
}

function initStage(can, stageList, lenis) {
  // Slots escondidos pelo CSS (ex.: Fórmula em telas estreitas) saem do roteiro.
  const stages = stageList.map((s) => ({ ...s, el: slotOf(s) })).filter((s) => s.el && s.el.offsetParent);
  const links = stages.slice(1).map((to, i) => {
    const link = { from: stages[i], to, target: 0, value: 0, trigger: null };
    if (!to.cut) {
      link.trigger = ScrollTrigger.create({
        trigger: to.el,
        start: to.start ?? 'top bottom',
        end: to.end ?? 'center center',
        onUpdate: (self) => (link.target = self.progress),
        onRefresh: (self) => (link.target = link.value = self.progress),
      });
    }
    return link;
  });

  // Inércia: a rolagem inclina e gira um pouco a lata, e ela volta ao parar.
  const drift = { lean: 0, spin: 0 };

  // Lê os slots no começo do frame, antes de qualquer tween escrever no DOM.
  const tick = (time, deltaMs) => {
    const damp = 1 - Math.exp((-deltaMs / 1000) * 7);
    const rects = new Map(stages.map((s) => [s, s.el.getBoundingClientRect()]));
    let pose = poseOf(stages[0], rects.get(stages[0]));
    for (const link of links) {
      if (link.to.cut) {
        // Troca no meio do vão entre os dois slots, quando ambos estão fora da tela.
        const gapMiddle = (rects.get(link.from).bottom + rects.get(link.to).top) / 2;
        link.value = gapMiddle < innerHeight / 2 ? 1 : 0;
      } else {
        link.value += (link.target - link.value) * damp;
      }
      if (link.value > 0.0005 && link.value < 0.9995) {
        // Em trânsito a lata recua um pouco (encolhe até 18%): abre espaço entre os blocos de texto.
        pose = mixPose(pose, poseOf(link.to, rects.get(link.to)), easeInOutCubic(link.value));
        pose.scale *= 1 - 0.18 * Math.sin(Math.PI * link.value);
      } else if (link.value >= 0.9995) {
        pose = poseOf(link.to, rects.get(link.to));
      }
    }

    const velocity = lenis.velocity || 0;
    drift.lean += (gsap.utils.clamp(-0.1, 0.1, -velocity * 0.004) - drift.lean) * damp;
    drift.spin += (gsap.utils.clamp(-0.5, 0.5, velocity * 0.012) - drift.spin) * damp;
    Object.assign(can.pose, pose);
    Object.assign(can.drift, drift);
  };
  gsap.ticker.add(tick, false, true);

  return {
    kill() {
      gsap.ticker.remove(tick);
      links.forEach((l) => l.trigger?.kill());
    },
  };
}

function initSmoothScroll() {
  // Roda e trackpad: deslize amortecido um pouco mais pesado que o padrão (0.1).
  // No toque o Lenis mantém a rolagem nativa, que já tem inércia.
  const lenis = new Lenis({ lerp: 0.08 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const onClick = (e) => {
    const link = e.target.closest('a[href^="#"]');
    // O skip-link precisa do comportamento nativo para mover o foco.
    if (!link || link.classList.contains('skip-link')) return;
    e.preventDefault();
    // Links do menu: viagem com começo e fim suaves, com a mesma curva da lata.
    lenis.scrollTo(link.getAttribute('href'), { duration: 1.4, easing: easeInOutCubic });
  };
  document.addEventListener('click', onClick);

  return {
    instance: lenis,
    destroy() {
      gsap.ticker.remove(tick);
      document.removeEventListener('click', onClick);
      lenis.destroy();
    },
  };
}

function initReveals() {
  // Títulos sobem linha a linha por trás de uma máscara, uma vez só (ease-out expo, ilustrativo).
  for (const title of document.querySelectorAll('main .section-title, .footer .section-title')) {
    splitLines(title);
    gsap.from(title.querySelectorAll('.line__inner'), {
      yPercent: 108,
      duration: 0.9,
      stagger: 0.08,
      ease: 'expo.out',
      scrollTrigger: { trigger: title, start: 'top 85%', once: true },
    });
  }

  // Números e linhas da ficha: fade curto subindo 12px, em cascata de 50ms, uma vez só.
  for (const [items, trigger] of [
    ['.spec', '.specs__list'],
    ['.ingredient', '.formula__list'],
  ]) {
    gsap.from(items, {
      opacity: 0,
      y: 12,
      duration: 0.5,
      stagger: 0.05,
      ease: 'power3.out',
      scrollTrigger: { trigger, start: 'top 80%', once: true },
    });
  }
}

// Cada linha do título (separada por <br>) ganha uma máscara própria.
function splitLines(title) {
  if (title.querySelector('.line')) return;
  title.innerHTML = title.innerHTML
    .split(/<br\s*\/?>/i)
    .map((line) => `<span class="line"><span class="line__inner">${line.trim()}</span></span>`)
    .join('');
}

// A faixa anda com a rolagem e para quando ela para: sem loop ocioso.
function initMarquee() {
  const tween = gsap.fromTo(
    '.marquee__track',
    { xPercent: 0 },
    {
      xPercent: -50,
      ease: 'none',
      scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
    },
  );

  return {
    kill() {
      tween.scrollTrigger?.kill();
      tween.kill();
    },
  };
}
