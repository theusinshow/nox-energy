import gsap from 'gsap';

export function playIntro(can, { reducedMotion }) {
  if (reducedMotion) return;
  if (can) {
    can.intro.y = -3.2;
    can.intro.spin = -Math.PI * 1.5;
  }

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  if (can) tl.to(can.intro, { y: 0, spin: 0, duration: 1.8 }, 0);
  tl.from('.hero__title span', { yPercent: 115, duration: 1.3, stagger: 0.09 }, 0.1);
  tl.from(['.nav', '.hero__bottom > *', '.hero__meta'], { opacity: 0, y: 16, duration: 1, stagger: 0.06, ease: 'power3.out' }, 0.6);
}
