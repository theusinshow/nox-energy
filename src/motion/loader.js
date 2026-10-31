import gsap from 'gsap';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cortina de entrada: tela cinza com a marca, cortada na diagonal que vai do canto
// superior direito ao inferior esquerdo. As duas metades se afastam e revelam o hero.
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
  // A linha do corte acompanha a diagonal real da tela, seja qual for a proporção.
  // Vai pelo GSAP: ele assume o transform inteiro, e um `rotate` no CSS seria descartado.
  const fitCut = () =>
    gsap.set(cut, {
      width: Math.hypot(innerWidth, innerHeight),
      rotation: (-Math.atan2(innerHeight, innerWidth) * 180) / Math.PI,
      xPercent: -50,
      yPercent: -50,
    });
  fitCut();
  addEventListener('resize', fitCut);

  const letters = loader.querySelectorAll('.loader__logo span');
  await gsap.fromTo(letters, { y: 0, yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out' });
  await Promise.all([ready, wait(350)]);

  const tl = gsap.timeline({
    onComplete: () => {
      removeEventListener('resize', fitCut);
      loader.remove();
      root.classList.remove('is-loading');
    },
  });
  // O corte nasce no centro da marca e corre até os cantos.
  tl.fromTo(cut, { scaleX: 0 }, { scaleX: 1, duration: 0.45, ease: 'power3.inOut' });
  tl.set(loader, { background: 'transparent' }, 'open');
  // Meia tela de deslocamento já tira cada triângulo inteiro de vista.
  tl.to(first, { xPercent: -55, yPercent: -55, duration: 1.1, ease: 'expo.inOut' }, 'open');
  tl.to(second, { xPercent: 55, yPercent: 55, duration: 1.1, ease: 'expo.inOut' }, 'open');
  tl.to(cut, { opacity: 0, duration: 0.2, ease: 'none' }, 'open');
  await new Promise((resolve) => tl.call(resolve, null, 'open+=0.15'));
}
