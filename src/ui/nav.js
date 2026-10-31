// Barra do topo: fica sólida ao sair do topo, some ao descer e volta ao subir, marca a
// seção em tela e, no celular, abre o menu em tela cheia.
export function initNav(header, menu) {
  const root = document.documentElement;
  const toggle = header.querySelector('.nav__toggle');
  const pageParts = [document.querySelector('main'), document.querySelector('.footer')];
  let lastY = scrollY;

  function onScroll() {
    const y = scrollY;
    const delta = y - lastY;
    header.classList.toggle('is-scrolled', y > 24);
    // O botão da barra só aparece depois do hero, que já tem o mesmo chamado.
    header.classList.toggle('is-past-hero', y > innerHeight * 0.6);
    if (Math.abs(delta) > 4) {
      header.classList.toggle('is-hidden', delta > 0 && y > innerHeight * 0.6);
      lastY = y;
    }
  }
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Seção atual: a que cruza a faixa logo acima do meio da tela.
  const links = [...document.querySelectorAll('.nav__links a, .menu__links a')];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = `#${entry.target.id}`;
        for (const link of links) {
          if (link.getAttribute('href') === id) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        }
      }
    },
    { rootMargin: '-40% 0px -55% 0px' },
  );
  for (const id of ['top', 'specs', 'sabores', 'formula']) observer.observe(document.getElementById(id));

  function setOpen(open, { restoreFocus = false } = {}) {
    if (open === !menu.hidden) return;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = open ? 'Fechar' : 'Menu';
    header.classList.toggle('is-open', open);
    root.classList.toggle('menu-open', open);
    pageParts.forEach((el) => (el.inert = open));
    if (open) {
      // Força o layout depois de sair do `hidden`, para a transição de entrada rodar.
      void menu.offsetHeight;
      menu.classList.add('is-visible');
      menu.querySelector('a').focus({ preventScroll: true });
    } else {
      menu.classList.remove('is-visible');
      if (restoreFocus) toggle.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(menu.hidden));
  // Fecha antes do listener de âncoras do documento (motion/scroll.js) rolar a página.
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) setOpen(false);
  });
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) setOpen(false, { restoreFocus: true });
  });
  matchMedia('(min-width: 769px)').addEventListener('change', (e) => e.matches && setOpen(false));
}
