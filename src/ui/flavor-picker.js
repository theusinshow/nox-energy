import gsap from 'gsap';
import { FLAVORS, DEFAULT_FLAVOR, getFlavor } from '../flavors.js';

// Radios nativos dão navegação por teclado de graça. Se o usuário trocar de novo durante
// a animação, o último sabor escolhido é aplicado quando ela termina.
export function initFlavorPicker(fieldset, { onChange }) {
  const note = document.querySelector('.flavor-note');
  const root = document.documentElement;

  fieldset.insertAdjacentHTML(
    'beforeend',
    FLAVORS.map(
      (f) => `
        <label class="flavor-option" style="--dot: ${f.accent}">
          <input type="radio" name="flavor" value="${f.id}" ${f.id === DEFAULT_FLAVOR ? 'checked' : ''} />
          <span>${f.name}</span>
          <span class="mono">${f.code}</span>
        </label>`,
    ).join(''),
  );
  note.textContent = getFlavor(DEFAULT_FLAVOR).note;

  let currentAccent = getFlavor(DEFAULT_FLAVOR).accent;
  let busy = false;
  let pending = null;

  async function apply(id) {
    if (busy) {
      pending = id;
      return;
    }
    busy = true;
    const flavor = getFlavor(id);
    note.textContent = flavor.note;
    gsap.fromTo(root, { '--accent': currentAccent }, { '--accent': flavor.accent, duration: 0.6, ease: 'power2.out' });
    currentAccent = flavor.accent;
    await onChange(id);
    busy = false;

    const next = pending;
    pending = null;
    if (next && next !== id) apply(next);
  }

  fieldset.addEventListener('change', (e) => {
    if (e.target.name === 'flavor') apply(e.target.value);
  });
}
