import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// Poses da lata por seção, em unidades da cena (câmera em z = 7).
const POSES = {
  desktop: {
    hero: { x: 0, y: -0.1, z: 0, rotX: 0.12, rotY: 0, scale: 1 },
    specs: { x: -1.7, y: 0, z: 0.4, rotX: -0.08, rotY: Math.PI * 1.25, scale: 1.05 },
    flavors: { x: 0.35, y: -0.05, z: 0.2, rotX: 0.05, rotY: Math.PI * 2, scale: 0.95 },
    formula: { x: 2.4, y: 0.1, z: -1.5, rotX: 0.2, rotY: Math.PI * 2.6, scale: 0.9 },
    exit: { x: 2.4, y: 4.5, z: -1.5, rotX: -0.3, rotY: Math.PI * 3.2, scale: 0.9 },
  },
  mobile: {
    hero: { x: 0, y: 0.3, z: 0, rotX: 0.12, rotY: 0, scale: 0.62 },
    specs: { x: 0.55, y: -0.6, z: -1, rotX: -0.08, rotY: Math.PI * 1.25, scale: 0.62 },
    flavors: { x: 0, y: 0.15, z: 0, rotX: 0.05, rotY: Math.PI * 2, scale: 0.72 },
    // No celular a lista ocupa a largura toda: a lata já sai de cena em Fórmula.
    formula: { x: 0, y: 4.5, z: -3, rotX: -0.3, rotY: Math.PI * 3.2, scale: 0.7 },
    exit: { x: 0, y: 4.5, z: -3, rotX: -0.3, rotY: Math.PI * 3.2, scale: 0.7 },
  },
};

// Cada transição vai de "topo da próxima seção entra na tela" até "chega ao topo"
// (ou ao `end` indicado). Os trechos não se sobrepõem.
// A saída tira a lata de cena antes do manifesto, para ela não cobrir texto.
const STEPS = [
  ['hero', 'specs', '#specs'],
  ['specs', 'flavors', '#sabores'],
  ['flavors', 'formula', '#formula'],
  ['formula', 'exit', '.manifesto', 'top 35%'],
];

export function initMotion(can) {
  const mm = gsap.matchMedia();
  // matchMedia só roda o callback quando alguma condição bate: desktop + mobile cobrem todos os casos.
  const conditions = {
    desktop: '(min-width: 769px)',
    mobile: '(max-width: 768px)',
    reduce: '(prefers-reduced-motion: reduce)',
  };
  mm.add(conditions, (ctx) => {
    const { mobile, reduce } = ctx.conditions;
    const poses = POSES[mobile ? 'mobile' : 'desktop'];
    if (can) Object.assign(can.pose, poses.hero);

    // Movimento reduzido: canvas preso ao hero, sem scroll suave nem animações de scroll.
    document.documentElement.classList.toggle('motion-reduce', reduce);
    if (reduce) return;

    const lenis = initSmoothScroll();
    if (can) {
      // fromTo com os dois extremos explícitos: a pose fica certa mesmo ao recarregar no meio da página.
      for (const [from, to, trigger, end = 'top top'] of STEPS) {
        gsap.fromTo(can.pose, { ...poses[from] }, {
          ...poses[to],
          ease: 'power1.inOut',
          immediateRender: false,
          scrollTrigger: { trigger, start: 'top bottom', end, scrub: 1 },
        });
      }
    }
    initReveals();
    const marquee = initMarquee();

    return () => {
      lenis.destroy();
      marquee.kill();
    };
  });
}

function initSmoothScroll() {
  const lenis = new Lenis({ lerp: 0.1 });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  const onClick = (e) => {
    const link = e.target.closest('a[href^="#"]');
    // O skip-link precisa do comportamento nativo para mover o foco.
    if (!link || link.classList.contains('skip-link')) return;
    e.preventDefault();
    lenis.scrollTo(link.getAttribute('href'));
  };
  document.addEventListener('click', onClick);

  return {
    destroy() {
      gsap.ticker.remove(tick);
      document.removeEventListener('click', onClick);
      lenis.destroy();
    },
  };
}

function initReveals() {
  gsap.to('.hero__title', {
    yPercent: -25,
    opacity: 0.15,
    ease: 'none',
    scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom top', scrub: true },
  });
  gsap.from('.spec', {
    xPercent: 30,
    opacity: 0,
    stagger: 0.2,
    ease: 'power2.out',
    scrollTrigger: { trigger: '#specs', start: 'top 75%', end: 'center 60%', scrub: 1 },
  });
}

// Faixa infinita; acelera com a velocidade do scroll e volta ao ritmo normal ao parar.
function initMarquee() {
  const tween = gsap.to('.marquee__track', { xPercent: -50, duration: 24, ease: 'none', repeat: -1 });
  let settle;
  const trigger = ScrollTrigger.create({
    trigger: '.manifesto',
    start: 'top bottom',
    end: 'bottom top',
    onUpdate(self) {
      const boost = 1 + Math.min(Math.abs(self.getVelocity()) / 350, 6);
      gsap.to(tween, { timeScale: boost, duration: 0.2, overwrite: true });
      settle?.kill();
      settle = gsap.delayedCall(0.25, () => gsap.to(tween, { timeScale: 1, duration: 0.8, overwrite: true }));
    },
  });

  return {
    kill() {
      tween.kill();
      trigger.kill();
      settle?.kill();
    },
  };
}
