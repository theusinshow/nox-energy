# NØX Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a landing page de portfólio do energético fictício NØX, com uma lata 3D em Three.js que reage ao scroll, ao mouse e à troca de sabor.

**Architecture:** Página estática em Vite (vanilla JS). Um `<canvas>` transparente e fixo renderiza a lata atrás do conteúdo. `scene/` cria e anima objetos 3D a partir de um objeto `pose`; `motion/` anima essa `pose` e o DOM com GSAP/ScrollTrigger; `ui/` cuida do seletor de sabor e da newsletter. Os dados dos sabores ficam num único módulo (`flavors.js`).

**Tech Stack:** Vite 5, Three.js 0.169, GSAP 3.12 (ScrollTrigger, matchMedia), Lenis 1.1, Vitest 2 (lógica pura).

**Spec:** `docs/superpowers/specs/2026-10-31-nox-landing-design.md`

## Global Constraints

- Idioma da interface: português (pt-BR). Marca: **NØX**, slogan "Energia que acende no escuro."
- Sabores e acentos exatos: Original `#C6FF00`, Ice `#3DF2FF`, Berry `#FF3DCB`.
- Tokens: `--bg #0A0B0A`, `--surface #121412`, `--text #EDEFEA`, `--muted #8A8F86`, `--accent` (muda por sabor).
- Fontes: Unbounded 800 (display), Manrope 400/600 (texto), JetBrains Mono 400/500 (rótulos).
- Site só em modo escuro. Sem backend: a newsletter não envia nada.
- `prefers-reduced-motion: reduce` → sem Lenis, sem scrub, sem giro; a lata fica parada no hero.
- Sem WebGL → classe `.no-webgl` e lata em CSS; o conteúdo continua legível.
- Celular (≤ 768px): poses próprias e DPR máximo de 1.5.

**Desvios da spec, já refletidos nela:**
1. **Sem bloom.** Bloom exige canvas opaco, e o "NØX" gigante precisa ficar *atrás* da lata (canvas transparente). O neon vem de `emissiveMap` no rótulo, de rim lights coloridas e de um plano de brilho radial atrás da lata.
2. **Troca de sabor:** em vez de ignorar cliques durante a animação, o último sabor escolhido é aplicado quando ela termina, para os radios nunca mostrarem um sabor diferente do da lata.

---

## File Structure

```
package.json, .gitignore
index.html                  marcação de todas as seções
src/main.js                 bootstrap: fontes → cena (ou fallback) → motion → UI
src/styles/main.css         tokens, layout, seções, fallback, estados
src/flavors.js              FLAVORS, DEFAULT_FLAVOR, SPECS, getFlavor()
src/scene/profile.js        CAN, bottomProfile(), topProfile(), bodyHeight()   (puro)
src/scene/label.js          getLabelTexture(id, maxAnisotropy) → CanvasTexture (cache)
src/scene/can.js            createCan() → { group, pose, intro, flavorSpin, setLabel, update }
src/scene/scene.js          createScene(canvas, opts) → { can, setFlavor }
src/motion/intro.js         playIntro(can, { reducedMotion })
src/motion/scroll.js        initMotion(can): Lenis, poses por seção, reveals, marquee
src/ui/flavor-picker.js     initFlavorPicker(fieldset, { onChange })
src/ui/newsletter.js        initNewsletter(form)
tests/flavors.test.js
tests/profile.test.js
```

---

### Task 1: Scaffold do projeto e dados dos sabores

**Files:**
- Create: `package.json`, `.gitignore`, `src/flavors.js`, `tests/flavors.test.js`

**Interfaces:**
- Produces: `FLAVORS: Array<{ id, name, accent, code, note }>`, `DEFAULT_FLAVOR: 'original'`, `SPECS: { caffeine, sugar, kcal, volume }`, `getFlavor(id) → flavor` (lança `Error('Sabor desconhecido: <id>')`).

- [ ] **Step 1: Criar `package.json` e `.gitignore`**

`package.json`:
```json
{
  "name": "nox-energy",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  }
}
```

`.gitignore`:
```
node_modules
dist
.DS_Store
```

- [ ] **Step 2: Instalar dependências**

Run: `npm install three@0.169.0 gsap@3.12.5 lenis@1.1.13` e depois `npm install -D vite@5.4.10 vitest@2.1.4`
Expected: `package.json` com `dependencies` e `devDependencies`, sem erros.

- [ ] **Step 3: Escrever o teste que falha**

`tests/flavors.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { FLAVORS, DEFAULT_FLAVOR, getFlavor } from '../src/flavors.js';

describe('flavors', () => {
  it('tem os três sabores da spec, na ordem, com as cores certas', () => {
    expect(FLAVORS.map((f) => [f.id, f.accent])).toEqual([
      ['original', '#C6FF00'],
      ['ice', '#3DF2FF'],
      ['berry', '#FF3DCB'],
    ]);
  });

  it('o sabor padrão existe', () => {
    expect(getFlavor(DEFAULT_FLAVOR).name).toBe('Original');
  });

  it('getFlavor falha com id desconhecido', () => {
    expect(() => getFlavor('uva')).toThrow('Sabor desconhecido: uva');
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL, não encontra `../src/flavors.js`.

- [ ] **Step 5: Implementar `src/flavors.js`**

```js
// Fonte única dos sabores: rótulo da lata, seletor e cor de acento leem daqui.
export const FLAVORS = [
  { id: 'original', name: 'Original', accent: '#C6FF00', code: 'N-01', note: 'Lima ácida com final cítrico e seco.' },
  { id: 'ice', name: 'Ice', accent: '#3DF2FF', code: 'N-02', note: 'Menta gelada e limão. Refresca até a última gota.' },
  { id: 'berry', name: 'Berry', accent: '#FF3DCB', code: 'N-03', note: 'Frutas vermelhas, intenso e doce na medida.' },
];

export const DEFAULT_FLAVOR = 'original';

export const SPECS = { caffeine: '160MG', sugar: '0G', kcal: '10KCAL', volume: '473ML' };

export function getFlavor(id) {
  const flavor = FLAVORS.find((f) => f.id === id);
  if (!flavor) throw new Error(`Sabor desconhecido: ${id}`);
  return flavor;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm test`
Expected: PASS (3 testes).

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json .gitignore src/flavors.js tests/flavors.test.js
git commit -m "chore: scaffold Vite project and flavor data"
```

---

### Task 2: Página estática (HTML + CSS)

A página precisa estar completa e legível sem nenhum JavaScript de cena. O JS entra nas próximas tarefas.

**Files:**
- Create: `index.html`, `src/styles/main.css`, `src/main.js` (versão mínima)

**Interfaces:**
- Produces (seletores usados por tarefas seguintes): `#scene` (canvas), `.hero__title span`, `.hero__bottom`, `.hero__meta`, `.nav`, `#top`, `#specs`, `#sabores`, `#formula`, `.spec`, `[data-reveal]`, `.card`, `.formula__grid`, `.manifesto`, `.marquee__track`, `fieldset.flavor-picker`, `.flavor-note`, `form.newsletter`, `.newsletter__status`. Classes no `<html>`: `js`, `is-ready`, `no-webgl`, `motion-reduce`. Variável CSS `--accent`.

- [ ] **Step 1: Criar `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>NØX Energy</title>
    <meta name="description" content="NØX: energia que acende no escuro. Projeto conceitual de portfólio." />
    <meta name="theme-color" content="#0A0B0A" />
    <script>document.documentElement.classList.add('js');</script>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;600&family=Unbounded:wght@800&display=swap"
    />
  </head>
  <body>
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <canvas id="scene" aria-hidden="true"></canvas>
    <div class="grain" aria-hidden="true"></div>

    <header class="nav">
      <a class="nav__logo" href="#top" aria-label="NØX, voltar ao início">NØX</a>
      <nav class="nav__links" aria-label="Principal">
        <a href="#specs">Specs</a>
        <a href="#sabores">Sabores</a>
        <a href="#formula">Fórmula</a>
      </nav>
      <span class="mono nav__tag">N-Series / 2026</span>
    </header>

    <main id="conteudo">
      <section class="hero" id="top">
        <h1 class="hero__title" aria-label="NØX">
          <span aria-hidden="true">N</span><span aria-hidden="true">Ø</span><span aria-hidden="true">X</span>
        </h1>
        <div class="can-fallback" aria-hidden="true"><span>NØX</span></div>
        <div class="hero__bottom">
          <p class="hero__tagline">Energia que acende<br />no escuro.</p>
          <a class="btn" href="#sabores">Descubra os sabores</a>
        </div>
        <p class="mono hero__meta">160MG cafeína · 0G açúcar · 473ML</p>
      </section>

      <section class="specs" id="specs" aria-labelledby="specs-title">
        <div class="specs__content">
          <p class="mono eyebrow" data-reveal>02 / Specs</p>
          <h2 class="section-title" id="specs-title" data-reveal>Tudo o que importa.<br />Nada que pese.</h2>
          <dl class="specs__list">
            <div class="spec"><dt class="mono">Cafeína</dt><dd class="spec__value">160<small>mg</small></dd></div>
            <div class="spec"><dt class="mono">Açúcar</dt><dd class="spec__value">0<small>g</small></dd></div>
            <div class="spec"><dt class="mono">Calorias</dt><dd class="spec__value">10<small>kcal</small></dd></div>
          </dl>
        </div>
      </section>

      <section class="flavors" id="sabores" aria-labelledby="flavors-title">
        <div class="flavors__intro">
          <p class="mono eyebrow" data-reveal>03 / Sabores</p>
          <h2 class="section-title" id="flavors-title" data-reveal>Escolha sua<br />frequência.</h2>
        </div>
        <div class="flavors__control">
          <fieldset class="flavor-picker">
            <legend class="mono">Sabor</legend>
            <!-- opções renderizadas a partir de src/flavors.js -->
          </fieldset>
          <p class="flavor-note" aria-live="polite"></p>
        </div>
      </section>

      <section class="formula" id="formula" aria-labelledby="formula-title">
        <p class="mono eyebrow" data-reveal>04 / Fórmula</p>
        <h2 class="section-title" id="formula-title" data-reveal>Seis ingredientes.<br />Zero enrolação.</h2>
        <ul class="formula__grid">
          <li class="card">
            <span class="mono">F-01</span>
            <h3>Cafeína natural</h3>
            <p class="card__dose">160mg</p>
            <p>Extraída do grão de café verde. Foco rápido, sem pico e queda.</p>
          </li>
          <li class="card">
            <span class="mono">F-02</span>
            <h3>Taurina</h3>
            <p class="card__dose">1000mg</p>
            <p>Ajuda na resistência em treinos longos e noites de trabalho.</p>
          </li>
          <li class="card">
            <span class="mono">F-03</span>
            <h3>Vitaminas B</h3>
            <p class="card__dose">B3 · B6 · B12</p>
            <p>Participam da conversão do alimento em energia.</p>
          </li>
          <li class="card">
            <span class="mono">F-04</span>
            <h3>L-Teanina</h3>
            <p class="card__dose">100mg</p>
            <p>Equilibra a cafeína para uma energia estável, sem ansiedade.</p>
          </li>
          <li class="card">
            <span class="mono">F-05</span>
            <h3>Eletrólitos</h3>
            <p class="card__dose">Na · K · Mg</p>
            <p>Repõem os minerais que você perde no suor.</p>
          </li>
          <li class="card">
            <span class="mono">F-06</span>
            <h3>Sucralose</h3>
            <p class="card__dose">0g açúcar</p>
            <p>Doçura sem calorias e sem pico de glicose.</p>
          </li>
        </ul>
      </section>

      <section class="manifesto" aria-label="Manifesto">
        <div class="marquee">
          <div class="marquee__track">
            <span>Sem açúcar <i>·</i> Sem pausa <i>·</i> Acende no escuro <i>·</i> NØX <i>·</i>&nbsp;</span>
            <span aria-hidden="true">Sem açúcar <i>·</i> Sem pausa <i>·</i> Acende no escuro <i>·</i> NØX <i>·</i>&nbsp;</span>
          </div>
        </div>
        <p class="manifesto__text" data-reveal>
          Feito para quem rende quando o resto da cidade apaga. Turnos longos, treinos tarde da noite, a última
          entrega antes do prazo.
        </p>
      </section>
    </main>

    <footer class="footer">
      <h2 class="section-title" data-reveal>Encontre perto<br />de você.</h2>
      <form class="newsletter">
        <label class="mono" for="email">Receba o aviso quando chegar na sua cidade</label>
        <div class="newsletter__row">
          <input id="email" type="email" name="email" placeholder="seu@email.com" autocomplete="email" required />
          <button class="btn" type="submit">Avisar</button>
        </div>
        <p class="mono newsletter__status" aria-live="polite"></p>
      </form>
      <div class="mono footer__bottom">
        <span>© 2026 NØX Energy Co.</span>
        <span>Projeto conceitual de portfólio. Marca fictícia.</span>
        <a href="#top">Voltar ao topo ↑</a>
      </div>
    </footer>

    <script type="module" src="/src/main.js"></script>
  </body>
</html>
```

- [ ] **Step 2: Criar `src/styles/main.css`**

```css
/* ---------- Tokens ---------- */
:root {
  --bg: #0a0b0a;
  --surface: #121412;
  --text: #edefea;
  --muted: #8a8f86;
  --accent: #c6ff00; /* muda por sabor (ui/flavor-picker.js) */
  --line: color-mix(in srgb, var(--accent) 18%, transparent);
  --glow: color-mix(in srgb, var(--accent) 45%, transparent);

  --font-display: 'Unbounded', system-ui, sans-serif;
  --font-body: 'Manrope', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --gutter: clamp(16px, 4vw, 56px);
  --radius: 10px;
  color-scheme: dark;
}

/* ---------- Base ---------- */
*,
*::before,
*::after {
  box-sizing: border-box;
}
html {
  background: var(--bg);
}
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: clamp(16px, 1.05vw, 18px);
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  overflow-x: clip;
}
h1, h2, h3, p, dl, dd, ul {
  margin: 0;
}
ul {
  padding: 0;
  list-style: none;
}
a {
  color: inherit;
  text-decoration: none;
}
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
::selection {
  background: var(--accent);
  color: var(--bg);
}

/* Lenis */
html.lenis,
html.lenis body {
  height: auto;
}
.lenis.lenis-smooth {
  scroll-behavior: auto !important;
}
.lenis.lenis-stopped {
  overflow: hidden;
}

.skip-link {
  position: fixed;
  top: 8px;
  left: 8px;
  z-index: 10;
  padding: 8px 14px;
  border-radius: 6px;
  background: var(--accent);
  color: var(--bg);
  transform: translateY(-150%);
}
.skip-link:focus {
  transform: none;
}

/* ---------- Camadas ----------
   0: título gigante do hero (atrás da lata)
   1: canvas 3D (transparente)
   2: conteúdo
   3: grão
   4: nav */
#scene {
  position: fixed;
  inset: 0;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  pointer-events: none;
}
.motion-reduce #scene {
  position: absolute;
  height: 100svh;
}
.no-webgl #scene {
  display: none;
}
.grain {
  position: fixed;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  opacity: 0.07;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>");
}
main,
.footer {
  position: relative;
}
main > section {
  padding-inline: var(--gutter);
}
main > section > *,
.footer > * {
  position: relative;
  z-index: 2;
}
.hero > .hero__title {
  z-index: 0;
}

/* ---------- Tipografia e componentes ---------- */
.mono {
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--muted);
}
.eyebrow {
  margin-bottom: 20px;
  color: var(--accent);
}
.section-title {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(34px, 5vw, 76px);
  line-height: 1.02;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}
.btn {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 14px 26px;
  border: 0;
  border-radius: 999px;
  background: var(--accent);
  color: var(--bg);
  font-family: var(--font-body);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: box-shadow 0.3s, transform 0.3s;
}
.btn:hover {
  box-shadow: 0 0 32px 4px var(--glow);
  transform: translateY(-2px);
}

/* ---------- Nav ---------- */
.nav {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 20px var(--gutter);
}
.nav__logo {
  font-family: var(--font-display);
  font-size: 20px;
  letter-spacing: 0.04em;
  color: var(--accent);
}
.nav__links {
  display: flex;
  gap: 28px;
  font-size: 14px;
}
.nav__links a {
  color: var(--muted);
  transition: color 0.2s;
}
.nav__links a:hover {
  color: var(--text);
}

/* ---------- Hero ---------- */
.hero {
  min-height: 100svh;
  display: grid;
  place-items: center;
  padding-block: 96px 40px;
  overflow: hidden;
}
.hero__title {
  grid-area: 1 / 1;
  display: flex;
  overflow: hidden;
  padding-bottom: 0.04em;
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(120px, 29vw, 480px);
  line-height: 0.85;
  letter-spacing: -0.04em;
  color: color-mix(in srgb, var(--text) 7%, var(--bg));
  -webkit-text-stroke: 1px var(--line);
}
.hero__title span {
  display: inline-block;
}
.hero__bottom {
  position: absolute;
  left: var(--gutter);
  bottom: 40px;
  display: grid;
  justify-items: start;
  gap: 20px;
}
.hero__tagline {
  font-size: clamp(18px, 1.6vw, 24px);
  font-weight: 600;
  line-height: 1.3;
}
.hero__meta {
  position: absolute;
  right: var(--gutter);
  bottom: 48px;
}
.js:not(.is-ready) .hero__title span,
.js:not(.is-ready) .hero__bottom,
.js:not(.is-ready) .hero__meta {
  opacity: 0;
}

/* Lata em CSS quando não há WebGL */
.can-fallback {
  display: none;
}
.no-webgl .can-fallback {
  grid-area: 1 / 1;
  display: grid;
  place-items: center;
  width: clamp(110px, 14vw, 170px);
  aspect-ratio: 1 / 2.35;
  border: 1px solid var(--line);
  border-radius: 22% / 9%;
  background: linear-gradient(90deg, #050605, #1b1e1b 45%, #070807);
  box-shadow: 0 0 120px 10px var(--glow);
}
.can-fallback span {
  writing-mode: vertical-rl;
  transform: rotate(180deg);
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(36px, 5vw, 60px);
  color: var(--accent);
}

/* ---------- Specs ---------- */
.specs {
  min-height: 120vh;
  display: grid;
  align-items: center;
}
.specs__content {
  width: min(560px, 100%);
  margin-left: auto;
}
.specs__list {
  display: grid;
  gap: 28px;
  margin-top: 48px;
}
.spec {
  display: flex;
  flex-direction: column-reverse;
  gap: 6px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--line);
}
.spec__value {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(56px, 7vw, 110px);
  line-height: 1;
  color: var(--accent);
}
.spec__value small {
  margin-left: 0.2em;
  font-size: 0.32em;
  color: var(--text);
}

/* ---------- Sabores ---------- */
.flavors {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1fr minmax(240px, 30vw) 1fr;
  align-items: center;
  gap: 32px;
}
.flavors__control {
  grid-column: 3;
  justify-self: end;
  width: min(340px, 100%);
}
.flavor-picker {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  border: 0;
}
.flavor-picker legend {
  margin-bottom: 14px;
  padding: 0;
}
.flavor-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 70%, transparent);
  backdrop-filter: blur(8px);
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.25s, background 0.25s;
}
.flavor-option::before {
  content: '';
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--dot);
  box-shadow: 0 0 12px var(--dot);
}
.flavor-option input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}
.flavor-option .mono {
  margin-left: auto;
}
.flavor-option:has(input:checked) {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 10%, var(--surface));
}
.flavor-option:has(input:focus-visible) {
  outline: 2px solid var(--accent);
  outline-offset: 3px;
}
.flavor-note {
  min-height: 3.2em;
  margin-top: 18px;
  color: var(--muted);
}

/* ---------- Fórmula ---------- */
.formula {
  padding-block: 120px 160px;
}
.formula__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin-top: 56px;
}
.card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 240px;
  padding: 28px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  backdrop-filter: blur(14px);
}
.card::after {
  content: '';
  position: absolute;
  top: 18px;
  right: 18px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--accent);
  box-shadow: 0 0 10px var(--accent);
}
.card h3 {
  margin-top: auto;
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 800;
  text-transform: uppercase;
}
.card__dose {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--accent);
}
.card p:last-child {
  font-size: 15px;
  color: var(--muted);
}

/* ---------- Manifesto ---------- */
.manifesto {
  padding-block: 120px;
  padding-inline: 0;
}
.marquee {
  overflow: hidden;
  padding-block: 28px;
  border-block: 1px solid var(--line);
}
.marquee__track {
  display: flex;
  width: max-content;
}
.marquee__track span {
  font-family: var(--font-display);
  font-weight: 800;
  font-size: clamp(48px, 9vw, 140px);
  line-height: 1;
  text-transform: uppercase;
  white-space: nowrap;
}
.marquee__track i {
  font-style: normal;
  color: var(--accent);
}
.manifesto__text {
  max-width: 640px;
  margin: 64px var(--gutter) 0;
  font-size: clamp(18px, 1.6vw, 24px);
  color: var(--muted);
}

/* ---------- Rodapé ---------- */
.footer {
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: end;
  gap: 48px 32px;
  padding: 120px var(--gutter) 32px;
  border-top: 1px solid var(--line);
  background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--accent) 6%, var(--bg)));
}
.newsletter {
  display: grid;
  gap: 14px;
  justify-self: end;
  width: min(440px, 100%);
}
.newsletter__row {
  display: flex;
  gap: 8px;
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface) 80%, transparent);
}
.newsletter__row:focus-within {
  border-color: var(--accent);
}
.newsletter input {
  flex: 1;
  min-width: 0;
  padding: 0 16px;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
}
.newsletter input:focus-visible {
  outline: none;
}
.newsletter__status {
  min-height: 1.5em;
  color: var(--accent);
  letter-spacing: 0.04em;
  text-transform: none;
}
.footer__bottom {
  grid-column: 1 / -1;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 12px 32px;
  padding-top: 32px;
  border-top: 1px solid var(--line);
}

/* ---------- Celular ---------- */
@media (max-width: 768px) {
  .nav__tag,
  .hero__meta {
    display: none;
  }
  .specs {
    align-items: end;
    padding-bottom: 64px;
  }
  .specs__content {
    width: 100%;
  }
  .flavors {
    grid-template-columns: 1fr;
    grid-template-rows: auto minmax(42vh, 1fr) auto;
    padding-block: 96px 48px;
  }
  .flavors__control {
    grid-column: 1;
    grid-row: 3;
    justify-self: stretch;
    width: 100%;
  }
  .footer {
    grid-template-columns: 1fr;
  }
  .newsletter {
    justify-self: stretch;
  }
}
```

- [ ] **Step 3: Criar `src/main.js` mínimo**

```js
import './styles/main.css';

document.documentElement.classList.add('is-ready');
```

- [ ] **Step 4: Verificar no navegador**

Criar `.claude/launch.json`:
```json
{
  "version": "0.0.1",
  "configurations": [
    { "name": "dev", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 }
  ]
}
```
Rodar o servidor `dev` e abrir `http://localhost:5173`.
Expected: todas as seções aparecem na ordem (hero, specs, sabores com o fieldset vazio, fórmula com 6 cards, faixa do manifesto, rodapé). Fundo `#0A0B0A`, acento lime, fontes Unbounded/Manrope/JetBrains carregadas. Em 375px não há scroll horizontal. Console sem erros.

- [ ] **Step 5: Commit**

```bash
git add index.html src/styles/main.css src/main.js .claude/launch.json
git commit -m "feat: static page markup and styles"
```

---

### Task 3: Lata 3D (geometria, rótulo, cena) e fallback

**Files:**
- Create: `src/scene/profile.js`, `tests/profile.test.js`, `src/scene/label.js`, `src/scene/can.js`, `src/scene/scene.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `getFlavor`, `SPECS`, `DEFAULT_FLAVOR` (Task 1); `#scene`, classes `is-ready`/`no-webgl` (Task 2).
- Produces:
  - `CAN = { radius, bodyBottom, bodyTop }`, `bottomProfile(): [x, y][]`, `topProfile(): [x, y][]`, `bodyHeight(): number`
  - `getLabelTexture(flavorId: string, maxAnisotropy?: number): THREE.CanvasTexture`
  - `createCan({ flavorId, maxAnisotropy })` → `{ group, pose: {x,y,z,rotX,rotY,scale}, intro: {y, spin}, flavorSpin: {value}, setLabel(id), update(time, { pointer, idle }) }`
  - `createScene(canvas, { flavorId, isMobile, reducedMotion })` → `{ can, setFlavor(id): Promise<void> }`; lança erro se não houver WebGL.

- [ ] **Step 1: Escrever o teste do perfil (falha)**

`tests/profile.test.js`:
```js
import { describe, it, expect } from 'vitest';
import { CAN, bottomProfile, topProfile, bodyHeight } from '../src/scene/profile.js';

describe('perfil da lata', () => {
  it('o fundo começa no eixo e termina na borda inferior do corpo', () => {
    const p = bottomProfile();
    expect(p[0][0]).toBe(0);
    expect(p.at(-1)).toEqual([CAN.radius, CAN.bodyBottom]);
  });

  it('o topo começa na borda superior do corpo e termina no eixo', () => {
    const p = topProfile();
    expect(p[0]).toEqual([CAN.radius, CAN.bodyTop]);
    expect(p.at(-1)[0]).toBe(0);
  });

  it('nenhum ponto tem raio negativo nem maior que o corpo', () => {
    for (const [x] of [...bottomProfile(), ...topProfile()]) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(CAN.radius);
    }
  });

  it('o corpo tem altura positiva', () => {
    expect(bodyHeight()).toBeGreaterThan(0);
  });
});
```

Run: `npm test`
Expected: FAIL, não encontra `../src/scene/profile.js`.

- [ ] **Step 2: Implementar `src/scene/profile.js`**

```js
// Perfis 2D [raio, altura] girados com LatheGeometry para as partes metálicas da lata.
// O corpo reto, onde vai o rótulo, é um cilindro entre bodyBottom e bodyTop.
// Proporção de uma lata de 473ml (66mm × 157mm).
export const CAN = { radius: 0.5, bodyBottom: -0.95, bodyTop: 0.92 };

export function bottomProfile() {
  const { radius: r, bodyBottom: b } = CAN;
  return [
    [0, -1.06], // domo central, abaulado para dentro
    [0.2, -1.09],
    [0.34, -1.15], // anel de apoio
    [0.41, -1.15],
    [0.47, -1.08],
    [r, b],
  ];
}

export function topProfile() {
  const { radius: r, bodyTop: t } = CAN;
  return [
    [r, t],
    [0.49, 0.98],
    [0.44, 1.07], // gargalo
    [0.42, 1.12],
    [0.425, 1.15], // aro
    [0.405, 1.155],
    [0.395, 1.115], // tampa rebaixada
    [0, 1.115],
  ];
}

export function bodyHeight() {
  return CAN.bodyTop - CAN.bodyBottom;
}
```

Run: `npm test`
Expected: PASS (7 testes no total).

- [ ] **Step 3: Implementar `src/scene/label.js`**

```js
import * as THREE from 'three';
import { getFlavor, SPECS } from '../flavors.js';
import { CAN, bodyHeight } from './profile.js';

const W = 2048;
// Altura proporcional à circunferência, para o desenho não sair esticado na lata.
const H = Math.round((W * bodyHeight()) / (2 * Math.PI * CAN.radius));
// O cilindro usa thetaStart = PI, então u = 0.5 (centro do canvas) fica de frente para a câmera.
const FRONT = W / 2;
const cache = new Map();

export function getLabelTexture(flavorId, maxAnisotropy = 1) {
  if (cache.has(flavorId)) return cache.get(flavorId);
  const texture = new THREE.CanvasTexture(drawLabel(getFlavor(flavorId)));
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  cache.set(flavorId, texture);
  return texture;
}

function drawLabel(flavor) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // Fundo preto fosco com leve gradiente vertical
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, '#161816');
  bg.addColorStop(1, '#060706');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Linhas finas de ponta a ponta, como no cartão de visita
  ctx.strokeStyle = hexWithAlpha(flavor.accent, 0.45);
  ctx.lineWidth = 3;
  for (const y of [H * 0.07, H * 0.93]) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  // "NØX" na vertical, na frente
  ctx.save();
  ctx.translate(FRONT, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.font = '800 100px Unbounded';
  const size = Math.round((100 * H * 0.74) / ctx.measureText('NØX').width);
  ctx.font = `800 ${size}px Unbounded`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = flavor.accent;
  ctx.fillText('NØX', 0, 0);
  ctx.restore();

  // Coluna esquerda: specs em mono
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'right';
  ctx.font = '500 34px "JetBrains Mono"';
  ctx.fillStyle = '#9AA095';
  [`${SPECS.caffeine} CAFFEINE`, `${SPECS.sugar} SUGAR`, SPECS.kcal, SPECS.volume].forEach((line, i) =>
    ctx.fillText(line, FRONT - 260, H * 0.62 + i * 52),
  );

  // Coluna direita: nome e código do sabor
  ctx.textAlign = 'left';
  ctx.font = '600 72px Manrope';
  ctx.fillStyle = '#EDEFEA';
  ctx.fillText(flavor.name.toUpperCase(), FRONT + 260, H * 0.3);
  ctx.font = '500 34px "JetBrains Mono"';
  ctx.fillStyle = flavor.accent;
  ctx.fillText(`${flavor.code} / ENERGY DRINK`, FRONT + 262, H * 0.3 + 60);

  // Verso: textos legais e código de barras decorativo
  ctx.font = '400 26px "JetBrains Mono"';
  ctx.fillStyle = '#6B7066';
  ['NØX ENERGY CO.', 'PROJETO CONCEITUAL', 'DE PORTFÓLIO'].forEach((line, i) => ctx.fillText(line, 120, H * 0.3 + i * 40));
  ['CONTÉM CAFEÍNA.', 'NÃO RECOMENDADO PARA CRIANÇAS,', 'GESTANTES E SENSÍVEIS À CAFEÍNA.'].forEach((line, i) =>
    ctx.fillText(line, 1520, H * 0.3 + i * 40),
  );
  ctx.fillStyle = '#C8CCC4';
  let x = 1520;
  for (let i = 0; i < 46; i++) {
    const w = [3, 5, 8][(i * 7) % 3];
    ctx.fillRect(x, H * 0.6, w, 150);
    x += w + (i % 2 ? 6 : 4);
  }

  return canvas;
}

function hexWithAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
```

- [ ] **Step 4: Implementar `src/scene/can.js`**

```js
import * as THREE from 'three';
import { CAN, bottomProfile, topProfile, bodyHeight } from './profile.js';
import { getLabelTexture } from './label.js';

// A lata separa três fontes de movimento para que não briguem entre si:
// pose (scroll), intro (entrada) e flavorSpin (troca de sabor). update() soma tudo.
export function createCan({ flavorId, maxAnisotropy }) {
  const group = new THREE.Group(); // posição, escala e inclinação
  const spinner = new THREE.Group(); // giro no eixo Y
  group.add(spinner);

  const label = getLabelTexture(flavorId, maxAnisotropy);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    map: label,
    emissiveMap: label, // as partes neon do rótulo "acendem"
    emissive: 0xffffff,
    emissiveIntensity: 0.35,
    roughness: 0.45,
    metalness: 0.3,
    clearcoat: 0.6,
    clearcoatRoughness: 0.35,
  });
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(CAN.radius, CAN.radius, bodyHeight(), 96, 1, true, Math.PI),
    bodyMat,
  );
  body.position.y = (CAN.bodyTop + CAN.bodyBottom) / 2;

  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xc8ccd2,
    metalness: 1,
    roughness: 0.28,
    side: THREE.DoubleSide,
  });
  const lathe = (points) =>
    new THREE.Mesh(new THREE.LatheGeometry(points.map(([x, y]) => new THREE.Vector2(x, y)), 96), metalMat);

  spinner.add(body, lathe(bottomProfile()), lathe(topProfile()), createTab(metalMat));

  const pose = { x: 0, y: 0, z: 0, rotX: 0, rotY: 0, scale: 1 };
  const intro = { y: 0, spin: 0 };
  const flavorSpin = { value: 0 };
  const tilt = { x: 0, y: 0 };

  function setLabel(id) {
    const texture = getLabelTexture(id, maxAnisotropy);
    bodyMat.map = texture;
    bodyMat.emissiveMap = texture;
  }

  function update(time, { pointer, idle }) {
    tilt.x += ((idle ? pointer.y * 0.18 : 0) - tilt.x) * 0.06;
    tilt.y += ((idle ? pointer.x * 0.25 : 0) - tilt.y) * 0.06;
    const float = idle ? Math.sin(time * 1.3) * 0.05 : 0;

    group.position.set(pose.x, pose.y + intro.y + float, pose.z);
    group.scale.setScalar(pose.scale);
    group.rotation.set(pose.rotX + tilt.x, 0, tilt.y * 0.3);
    spinner.rotation.y = pose.rotY + intro.spin + flavorSpin.value + tilt.y + (idle ? time * 0.12 : 0);
  }

  return { group, pose, intro, flavorSpin, setLabel, update };
}

function createTab(material) {
  const shape = new THREE.Shape();
  roundedRect(shape, -0.11, -0.07, 0.22, 0.14, 0.06);
  const hole = new THREE.Path();
  hole.absellipse(0, 0.015, 0.045, 0.03, 0, Math.PI * 2, false, 0);
  shape.holes.push(hole);

  const tab = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: false }), material);
  tab.rotation.x = -Math.PI / 2;
  tab.position.set(0, 1.12, 0.12);
  return tab;
}

function roundedRect(s, x, y, w, h, r) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
}
```

- [ ] **Step 5: Implementar `src/scene/scene.js`**

```js
import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createCan } from './can.js';
import { getFlavor } from '../flavors.js';

// Renderer, câmera, luzes e lata. Lança erro se o WebGL não estiver disponível.
export function createScene(canvas, { flavorId, isMobile, reducedMotion }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
  camera.position.set(0, 0, 7);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(3, 4, 5);
  scene.add(key);

  const can = createCan({ flavorId, maxAnisotropy: renderer.capabilities.getMaxAnisotropy() });
  scene.add(can.group);

  // Luzes de contorno e brilho na cor do sabor: presas à lata, acompanham o scroll.
  const accent = new THREE.Color(getFlavor(flavorId).accent);
  const rimLeft = new THREE.PointLight(accent, 18, 8, 1.5);
  rimLeft.position.set(-1.6, 0.8, -1.2);
  const rimRight = new THREE.PointLight(accent, 12, 8, 1.5);
  rimRight.position.set(1.6, -0.6, -1.2);
  const glow = new THREE.Mesh(
    new THREE.PlaneGeometry(5, 5),
    new THREE.MeshBasicMaterial({
      map: radialTexture(),
      color: accent,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  glow.position.z = -1.2;
  can.group.add(rimLeft, rimRight, glow);

  const pointer = { x: 0, y: 0 };
  if (matchMedia('(pointer: fine)').matches) {
    window.addEventListener('pointermove', (e) => {
      pointer.x = (e.clientX / innerWidth) * 2 - 1;
      pointer.y = (e.clientY / innerHeight) * 2 - 1;
    });
  }

  function resize() {
    renderer.setSize(innerWidth, innerHeight, false);
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  const clock = new THREE.Clock();
  const idle = !reducedMotion;
  function render() {
    can.update(clock.getElapsedTime(), { pointer, idle });
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(render);
  document.addEventListener('visibilitychange', () => renderer.setAnimationLoop(document.hidden ? null : render));

  let current = flavorId;
  function setFlavor(id) {
    if (id === current) return Promise.resolve();
    current = id;
    const target = new THREE.Color(getFlavor(id).accent);
    const colors = [rimLeft.color, rimRight.color, glow.material.color];

    if (reducedMotion) {
      can.setLabel(id);
      colors.forEach((c) => c.copy(target));
      return Promise.resolve();
    }

    // Giro de 360°; o rótulo troca na metade, quando a frente está de costas para a câmera.
    return new Promise((resolve) => {
      const tl = gsap.timeline({ onComplete: resolve });
      tl.to(can.flavorSpin, { value: `+=${Math.PI * 2}`, duration: 0.9, ease: 'power3.inOut' }, 0);
      tl.call(() => can.setLabel(id), null, 0.45);
      colors.forEach((c) => tl.to(c, { r: target.r, g: target.g, b: target.b, duration: 0.5, ease: 'power2.out' }, 0.3));
    });
  }

  return { can, setFlavor };
}

function radialTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.25)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
```

- [ ] **Step 6: Ligar a cena em `src/main.js`**

Substituir o conteúdo inteiro por:
```js
import './styles/main.css';
import { DEFAULT_FLAVOR } from './flavors.js';
import { createScene } from './scene/scene.js';

const root = document.documentElement;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isMobile = matchMedia('(max-width: 768px)').matches;

// O rótulo é desenhado em canvas: sem as fontes carregadas ele sairia com a fonte do sistema.
async function loadFonts() {
  const fonts = ['800 100px Unbounded', '600 72px Manrope', '500 34px "JetBrains Mono"', '400 26px "JetBrains Mono"'];
  const timeout = new Promise((resolve) => setTimeout(resolve, 2500));
  await Promise.race([Promise.all(fonts.map((f) => document.fonts.load(f))), timeout]);
}

async function boot() {
  await loadFonts();

  let scene = null;
  try {
    scene = createScene(document.getElementById('scene'), { flavorId: DEFAULT_FLAVOR, isMobile, reducedMotion });
  } catch (err) {
    console.warn('WebGL indisponível, usando a lata em CSS.', err);
    root.classList.add('no-webgl');
  }

  root.classList.add('is-ready');
  return scene;
}

boot();
```

- [ ] **Step 7: Verificar no navegador**

Recarregar `http://localhost:5173`.
Expected:
- A lata aparece no centro do hero, na frente do "NØX" gigante, girando devagar, flutuando e inclinando com o mouse.
- Rótulo nítido e sem esticar: "NØX" vertical em lime de frente, specs à esquerda, "ORIGINAL / N-01" à direita, verso com texto e código de barras. As fontes do rótulo são Unbounded/Manrope/JetBrains, não a do sistema.
- Topo com aro, tampa rebaixada e lacre; fundo abaulado. Sem faces faltando.
- Brilho lime atrás da lata e contorno colorido nas laterais. Se as rim lights estiverem fracas ou estouradas, ajustar só as intensidades (18/12) e `emissiveIntensity` (0.35), e anotar os valores finais no commit.
- Teste de fallback: colocar temporariamente `throw new Error('teste');` na primeira linha de `createScene` e recarregar. Expected: aviso no console, a lata em CSS com glow aparece no hero e o resto da página fica igual. Desfazer a edição.
- `npm test` continua PASS.

- [ ] **Step 8: Commit**

```bash
git add src/scene tests/profile.test.js src/main.js
git commit -m "feat: 3D can with canvas label, rim lights and WebGL fallback"
```

---

### Task 4: Movimento (intro, scroll, reveals, marquee)

**Files:**
- Create: `src/motion/intro.js`, `src/motion/scroll.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `can.pose`, `can.intro` (Task 3, `can` pode ser `null` sem WebGL); seletores da Task 2.
- Produces: `playIntro(can | null, { reducedMotion })`, `initMotion(can | null)`. `initMotion` adiciona/remove `motion-reduce` no `<html>`.

- [ ] **Step 1: Implementar `src/motion/intro.js`**

```js
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
```

- [ ] **Step 2: Implementar `src/motion/scroll.js`**

```js
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

// Poses da lata por seção, em unidades da cena (câmera em z = 7).
const POSES = {
  desktop: {
    hero: { x: 0, y: -0.1, z: 0, rotX: 0.12, rotY: 0, scale: 1 },
    specs: { x: -1.7, y: 0, z: 0.4, rotX: -0.08, rotY: Math.PI * 1.25, scale: 1.05 },
    flavors: { x: 0, y: -0.05, z: 0.5, rotX: 0.05, rotY: Math.PI * 2, scale: 1.1 },
    formula: { x: 1.5, y: 0.2, z: -2.5, rotX: 0.25, rotY: Math.PI * 2.6, scale: 0.85 },
  },
  mobile: {
    hero: { x: 0, y: 0, z: 0, rotX: 0.12, rotY: 0, scale: 0.8 },
    specs: { x: 0, y: 0.95, z: 0, rotX: -0.08, rotY: Math.PI * 1.25, scale: 0.6 },
    flavors: { x: 0, y: 0.15, z: 0, rotX: 0.05, rotY: Math.PI * 2, scale: 0.72 },
    formula: { x: 0, y: 0.3, z: -3, rotX: 0.25, rotY: Math.PI * 2.6, scale: 0.7 },
  },
};

// Cada transição vai de "topo da próxima seção entra na tela" até "chega ao topo".
// Como as seções têm pelo menos 100vh, os trechos não se sobrepõem.
const STEPS = [
  ['hero', 'specs', '#specs'],
  ['specs', 'flavors', '#sabores'],
  ['flavors', 'formula', '#formula'],
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
      for (const [from, to, trigger] of STEPS) {
        gsap.fromTo(can.pose, { ...poses[from] }, {
          ...poses[to],
          ease: 'power1.inOut',
          immediateRender: false,
          scrollTrigger: { trigger, start: 'top bottom', end: 'top top', scrub: 1 },
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
  for (const el of gsap.utils.toArray('[data-reveal]')) {
    gsap.from(el, {
      y: 40,
      opacity: 0,
      duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  }
  gsap.from('.card', {
    y: 60,
    opacity: 0,
    duration: 0.8,
    stagger: 0.08,
    ease: 'power3.out',
    scrollTrigger: { trigger: '.formula__grid', start: 'top 80%' },
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
```

- [ ] **Step 3: Ligar em `src/main.js`**

Adicionar os imports no topo:
```js
import { playIntro } from './motion/intro.js';
import { initMotion } from './motion/scroll.js';
```
E, no fim de `boot()`, trocar `root.classList.add('is-ready');` e `return scene;` por:
```js
  root.classList.add('is-ready');
  initMotion(scene?.can ?? null);
  playIntro(scene?.can ?? null, { reducedMotion });
  return scene;
```

- [ ] **Step 4: Verificar no navegador**

Expected (desktop 1440px):
- Ao carregar: a lata sobe girando, as letras do "NØX" sobem uma a uma, e nav/tagline/botão aparecem em seguida. Não há flash do conteúdo antes da intro.
- Scroll suave (Lenis). Hero → Specs: a lata desliza para a esquerda e gira enquanto os 3 números entram pela direita. → Sabores: volta ao centro, maior. → Fórmula: recua para a direita e fica atrás dos cards (os cards desfocam a lata).
- Recarregar no meio da página (ex.: em Fórmula): a lata já aparece na pose certa.
- Os links da nav e "Descubra os sabores" rolam suavemente até a seção.
- O marquee roda sem emenda e acelera ao rolar rápido.
- Em 375px: poses de celular (lata acima dos números em Specs, centralizada em Sabores), sem scroll horizontal.
- DevTools → Rendering → `prefers-reduced-motion: reduce` e recarregar: sem intro, sem Lenis, a lata fica parada no hero e sai junto com ele; todo o conteúdo visível.
- Console sem erros.

- [ ] **Step 5: Commit**

```bash
git add src/motion src/main.js
git commit -m "feat: intro, scroll-driven can poses, reveals and marquee"
```

---

### Task 5: Seletor de sabor e newsletter

**Files:**
- Create: `src/ui/flavor-picker.js`, `src/ui/newsletter.js`
- Modify: `src/main.js`

**Interfaces:**
- Consumes: `FLAVORS`, `DEFAULT_FLAVOR`, `getFlavor` (Task 1); `scene.setFlavor(id): Promise<void>` (Task 3; `scene` pode ser `null`); `fieldset.flavor-picker`, `.flavor-note`, `form.newsletter`, `.newsletter__status` (Task 2).
- Produces: `initFlavorPicker(fieldset, { onChange: (id) => Promise<void> | void })`, `initNewsletter(form)`.

- [ ] **Step 1: Implementar `src/ui/flavor-picker.js`**

```js
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
```

- [ ] **Step 2: Implementar `src/ui/newsletter.js`**

```js
// Projeto conceitual: nada é enviado. A validação nativa (type="email" + required) roda antes do submit.
export function initNewsletter(form) {
  const input = form.querySelector('input');
  const button = form.querySelector('button');
  const status = form.querySelector('.newsletter__status');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    input.disabled = true;
    button.disabled = true;
    button.textContent = 'Inscrito!';
    status.textContent = 'Pronto! Este é um projeto conceitual, então nada foi enviado.';
  });
}
```

- [ ] **Step 3: Ligar em `src/main.js`**

Adicionar os imports no topo:
```js
import { initFlavorPicker } from './ui/flavor-picker.js';
import { initNewsletter } from './ui/newsletter.js';
```
E, em `boot()`, logo antes de `return scene;`:
```js
  initFlavorPicker(document.querySelector('.flavor-picker'), { onChange: (id) => scene?.setFlavor(id) });
  initNewsletter(document.querySelector('.newsletter'));
```

- [ ] **Step 4: Verificar no navegador**

Expected:
- Em Sabores aparecem 3 opções (bolinha colorida, nome, código), com Original marcada.
- Clicar em Ice: a lata gira 360°, o rótulo vira "ICE / N-02" em ciano na metade do giro, as luzes e o brilho ficam ciano, e o site inteiro (botões, bordas, números, logo) faz transição para ciano. A nota muda e é anunciada (`aria-live`).
- Clicar Ice → Berry rápido: no fim, a lata e o site ficam em Berry, igual ao radio marcado.
- Teclado: Tab chega no grupo e as setas trocam de sabor, com foco visível.
- Com `prefers-reduced-motion`: a troca é instantânea, sem giro.
- Sem WebGL: a troca muda a cor do site e o glow da lata em CSS.
- Newsletter: e-mail inválido mostra a validação nativa; um válido mostra "Inscrito!" e a mensagem de status, sem nenhuma requisição de rede.

- [ ] **Step 5: Commit**

```bash
git add src/ui src/main.js
git commit -m "feat: flavor picker with live can/accent swap and fake newsletter"
```

---

### Task 6: Verificação final e build

**Files:**
- Modify: só o que a verificação apontar.

- [ ] **Step 1: Testes e build**

Run: `npm test` e depois `npm run build`
Expected: testes PASS; `dist/` gerado sem erros nem warnings de import.

- [ ] **Step 2: Conferir o build**

Run: `npm run preview` e abrir a URL indicada (porta 4173).
Expected: o site se comporta igual ao dev, sem erros no console.

- [ ] **Step 3: Checklist manual**

- [ ] Desktop 1440px: todas as seções, scroll, troca dos 3 sabores.
- [ ] Celular 375px: poses de celular, sem scroll horizontal, nav legível.
- [ ] `prefers-reduced-motion` emulado.
- [ ] Fallback sem WebGL (edição temporária de `createScene` para lançar erro, depois desfazer).
- [ ] Aba oculta pausa o render (DevTools → Performance: sem frames com a aba em segundo plano).
- [ ] Lighthouse (mobile) no build de preview: Performance ≥ 80, Acessibilidade ≥ 95. Se Performance ficar abaixo, primeiro reduzir os segmentos (96 → 64) e o tamanho do rótulo (2048 → 1536) e medir de novo.

- [ ] **Step 4: Commit dos ajustes (se houver)**

```bash
git add -A
git commit -m "fix: adjustments from final verification"
```
