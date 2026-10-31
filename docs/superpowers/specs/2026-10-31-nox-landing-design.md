# NØX — Landing page de energético (peça de portfólio)

**Data:** 2026-10-31
**Status:** aprovado em conversa, aguardando revisão da spec

## 1. Objetivo

Landing page de uma página para uma marca **fictícia** de energético, feita como peça de portfólio. O foco é impacto visual e experiência de scroll: não há checkout, backend nem CMS.

Referência de estilo: mockup de cartão de visita "modern neon green dark" (Magnific/Freepik). Fundo quase preto, um único acento verde neon, tipografia limpa, detalhes técnicos em letras miúdas e bordas finas.

**Critérios de sucesso**
- A lata 3D é o centro da experiência e reage ao scroll, ao mouse e à troca de sabor.
- A troca de sabor muda o rótulo da lata e a cor de acento do site inteiro.
- Roda fluido (60fps) em desktop médio e de forma aceitável no celular.
- Nunca quebra: há fallback sem WebGL e versão estática com `prefers-reduced-motion`.
- Pronto para deploy estático na Vercel.

**Fora do escopo:** carrinho, loja, i18n, CMS, analytics, formulários que enviam dados de verdade.

## 2. Marca

- **Nome:** NØX
- **Slogan:** "Energia que acende no escuro."
- **Sabores:**

| id | Nome | Acento | Uso |
|---|---|---|---|
| `original` | Original | `#C6FF00` (lime) | padrão do site |
| `ice` | Ice | `#3DF2FF` (ciano) | |
| `berry` | Berry | `#FF3DCB` (magenta) | |

- **Specs (iguais para todos):** 160mg de cafeína, 0g de açúcar, 10 kcal, lata de 473ml.

## 3. Sistema visual

**Tipografia (Google Fonts)**
- Display: **Unbounded** 800, para títulos e o "NØX" gigante.
- Texto corrido: **Manrope** 400/600.
- Mono: **JetBrains Mono** 400/500, para rótulos, números e letras miúdas (ex.: `160MG / CAFFEINE`).

**Tokens de cor (`:root`)**
```
--bg:        #0A0B0A
--surface:   #121412
--text:      #EDEFEA
--muted:     #8A8F86
--accent:    #C6FF00   /* muda por sabor */
--line:      color-mix(in srgb, var(--accent) 18%, transparent)
--glow:      color-mix(in srgb, var(--accent) 45%, transparent)
```
O site é apenas em modo escuro, de propósito.

**Detalhes recorrentes:** grão/noise sutil sobre o fundo, bordas de 1px em `--line`, cantos levemente arredondados (8–12px), rótulos mono em caixa alta com tracking largo.

## 4. Estrutura da página

1. **Hero:** "NØX" gigante atrás da lata, tagline, CTA "Descubra os sabores" (rola até a seção 3) e um glow radial de `--accent` atrás da lata.
2. **Specs:** a lata gira e desliza para a esquerda; três números grandes entram pela direita (160mg / 0g / 10kcal) com rótulos mono.
3. **Sabores:** seletor com 3 opções (botões com nome e bolinha de cor). A seleção dispara a troca de sabor (ver 6.4). A lata volta ao centro.
4. **Fórmula:** grid de 4 a 6 cards pretos (`--surface`) com borda neon fina, no estilo do cartão de visita: ingrediente, dosagem e uma linha de descrição. A lata recua ou fica pequena ao fundo.
5. **Manifesto:** marquee horizontal de texto grande ("SEM AÇÚCAR · SEM PAUSA · NØX ·"), com velocidade influenciada pelo scroll.
6. **Rodapé:** CTA final "Encontre perto de você", campo de newsletter (só visual, o envio mostra "Inscrito!" sem rede), links fictícios e o crédito "Projeto conceitual de portfólio".

## 5. Arquitetura técnica

**Stack:** Vite (vanilla JS, ES modules), Three.js, GSAP + ScrollTrigger, Lenis. Sem framework de UI.

**Arquivos**
```
index.html              marcação semântica de todas as seções
src/main.js             bootstrap: detecta capacidades, inicia scroll, cena e UI
src/styles/main.css     tokens, layout, seções, fallback
src/flavors.js          dados dos sabores (id, nome, cor, textos do rótulo)
src/scene/scene.js      renderer, câmera, luzes, ambiente, brilho, loop, resize; setFlavor()
src/scene/profile.js    perfis 2D da lata (lógica pura, testada)
src/scene/can.js        geometria e materiais da lata; API de pose
src/scene/label.js      desenha o rótulo em canvas → CanvasTexture (por sabor)
src/motion/scroll.js    Lenis + timelines do ScrollTrigger (pose da lata por seção)
src/motion/intro.js     animação de entrada (lata + revelação do título)
src/ui/flavor-picker.js seletor de sabor; atualiza --accent e chama a cena
src/ui/newsletter.js    feedback falso de inscrição
```

**Fronteiras**
- `scene/` não conhece o DOM das seções. Ela expõe `can.pose` (posição, rotação, escala) e `setFlavor(id)`.
- `motion/` anima `can.pose` e os elementos DOM, mas não cria objetos 3D.
- `ui/` lida com eventos e estado do sabor, e fala com a cena só via `setFlavor`.
- O estado do sabor atual mora em `flavor-picker.js`, que emite um evento `flavorchange` no `document`.

## 6. Detalhes da cena 3D

### 6.1 Lata
- O corpo é uma `LatheGeometry` a partir de um perfil de ~20 pontos: fundo abaulado, chanfro inferior, corpo reto, gargalo afunilado e aro superior.
- Materiais: corpo com `MeshPhysicalMaterial` (rótulo como `map`, roughness ~0.45, clearcoat leve); topo/fundo em alumínio (metalness 1, roughness ~0.25).
- Lacre: geometria simples (chapa extrudada) sobre o topo.

### 6.2 Rótulo (`label.js`)
- Canvas 2048×1024, fundo preto fosco com leve gradiente.
- "NØX" na vertical em `--accent`, linhas finas, specs em mono pequeno, nome do sabor e um código decorativo (ex.: `N-01 / 473ML`).
- Uma textura por sabor, gerada uma vez e guardada em cache.

### 6.3 Iluminação e brilho
- `RoomEnvironment` via `PMREMGenerator` para os reflexos.
- Key light branca suave e duas rim lights na cor do sabor, presas à lata.
- **Sem bloom:** o canvas é transparente para o "NØX" gigante do hero ficar *atrás* da lata, e o bloom exige canvas opaco. O neon vem do `emissiveMap` do rótulo, das rim lights e de um plano de brilho radial atrás da lata.
- `renderer.setPixelRatio(Math.min(devicePixelRatio, isMobile ? 1.5 : 2))`.

### 6.4 Troca de sabor
Timeline GSAP de ~0.9s: a lata gira 360° no eixo Y e, na metade, troca a textura; a cor das rim lights, do brilho e de `--accent` (no `document.documentElement`) faz transição para a nova cor. Se o usuário escolher outro sabor durante a troca, o último escolhido é aplicado quando ela termina.

## 7. Movimento

- **Intro:** a lata sobe de baixo girando (~1.4s, `expo.out`) enquanto as letras do "NØX" sobem com stagger.
- **Idle:** flutuação senoidal pequena no Y e inclinação seguindo o mouse (lerp), só no desktop.
- **Scroll:** o canvas fica `position: fixed` atrás do conteúdo. Cada seção tem um ScrollTrigger com `scrub` que interpola `can.pose` entre poses definidas (hero → specs → sabores → fórmula).
- **Lenis** cuida do scroll suave e fica sincronizado com o ScrollTrigger (`lenis.on('scroll', ScrollTrigger.update)`, ticker do GSAP).

## 8. Robustez

- **Sem WebGL** (falha ao criar o contexto): adiciona `.no-webgl` no `<html>`, esconde o canvas e mostra uma lata em CSS (retângulo arredondado com gradiente e o nome) com glow. Todo o conteúdo continua legível.
- **`prefers-reduced-motion: reduce`:** sem Lenis, sem scrub e sem giro. A lata fica parada no hero e a troca de sabor vira só troca de textura e cor.
- **Resize:** atualiza câmera, renderer e composer, e roda `ScrollTrigger.refresh()`.
- **Aba oculta:** pausa o loop de render (`visibilitychange`).
- **Acessibilidade:** o seletor de sabor é um `radiogroup` navegável por teclado, o canvas tem `aria-hidden="true"`, o contraste do texto é ≥ 4.5:1 e o foco é visível em `--accent`.

## 9. Verificação

Sem testes automatizados (peça visual). A verificação é manual no navegador:
- desktop 1440px e celular 375px: todas as seções, scroll e troca dos 3 sabores;
- com `prefers-reduced-motion` emulado;
- com WebGL desativado (fallback);
- console sem erros; `npm run build` gera `dist/` funcional;
- Lighthouse: Performance ≥ 80 no mobile, Acessibilidade ≥ 95.
