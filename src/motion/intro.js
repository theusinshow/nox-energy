import gsap from 'gsap';

// Entrada do texto: roda assim que as fontes chegam, sem esperar a cena 3D.
export function playIntro({ reducedMotion }) {
  if (reducedMotion) return;
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.from('.hero__title span', { yPercent: 115, duration: 1.3, stagger: 0.09 }, 0.1);
  tl.from(['.nav', '.hero__bottom > *', '.hero__meta'], { opacity: 0, y: 16, duration: 1, stagger: 0.06, ease: 'power3.out' }, 0.6);
}

// Entrada da lata: roda quando o chunk do Three.js termina de carregar.
export function playCanEntrance(can, { reducedMotion }) {
  if (reducedMotion) return;
  gsap.fromTo(can.intro, { y: -3.2, spin: -Math.PI * 1.5 }, { y: 0, spin: 0, duration: 1.8, ease: 'expo.out' });
}
