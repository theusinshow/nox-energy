// Perfis 2D [raio, altura] girados com LatheGeometry. A lata tem três peças:
// fundo (alumínio), corpo impresso (do pé até o gargalo, ombro incluído) e tampa (alumínio).
// Proporção de uma lata de 473ml (66mm × 157mm); as curvas são Bézier amostradas.
export const CAN = {
  radius: 0.5,
  bodyBottom: -0.95,
  shoulderStart: 0.84,
  neckRadius: 0.405,
  neckY: 1.09,
  lidPanelRadius: 0.362,
  lidPanelY: 1.1,
};

export function bottomProfile() {
  const { radius: r, bodyBottom: b } = CAN;
  return join(
    bezier([0, -1.035], [0.16, -1.035], [0.3, -1.07], [0.33, -1.13], 10), // domo, abaulado para dentro
    bezier([0.33, -1.13], [0.34, -1.152], [0.37, -1.155], [0.385, -1.142], 6), // anel de apoio
    bezier([0.385, -1.142], [0.43, -1.1], [r, -1.02], [r, b], 10), // calcanhar
  );
}

export function bodyProfile() {
  const { radius: r, bodyBottom: b, shoulderStart: s, neckRadius: n, neckY } = CAN;
  return join(
    [[r, b]],
    [[r, s]],
    bezier([r, s], [r, 0.955], [n, 0.975], [n, 1.06], 28), // ombro em S até o gargalo
    [[n, neckY]],
  );
}

export function lidProfile() {
  const { neckRadius: n, neckY, lidPanelRadius: pr, lidPanelY: py } = CAN;
  return join(
    bezier([n, neckY], [0.425, 1.1], [0.432, 1.12], [0.432, 1.142], 6), // costura dupla, por fora
    bezier([0.432, 1.142], [0.432, 1.168], [0.41, 1.168], [0.406, 1.15], 8), // topo arredondado
    bezier([0.406, 1.15], [0.4, 1.12], [0.39, 1.085], [0.378, 1.085], 6), // parede interna até o rebaixo
    bezier([0.378, 1.085], [0.368, 1.085], [pr, 1.092], [pr, py], 4),
  );
}

// Caixa da lata inteira (fundo, corpo e tampa), em unidades da cena.
export function canBounds() {
  const ys = [...bottomProfile(), ...lidProfile()].map(([, y]) => y);
  return { top: Math.max(...ys), bottom: Math.min(...ys), radius: CAN.radius };
}

// Comprimento de arco acumulado, normalizado de 0 a 1: vira a coordenada v do rótulo,
// para o desenho não esticar no ombro (onde os pontos ficam mais próximos).
export function arcLengths(points) {
  const acc = [0];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    acc.push(acc[i - 1] + Math.hypot(x1 - x0, y1 - y0));
  }
  const total = acc.at(-1);
  return acc.map((d) => d / total);
}

// Altura impressa total, medida ao longo da superfície.
export function printedHeight() {
  return length(bodyProfile());
}

// Quanto do rótulo (de cima para baixo) fica no ombro e no gargalo.
export function shoulderFraction() {
  return 1 - (CAN.shoulderStart - CAN.bodyBottom) / printedHeight();
}

function length(points) {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return total;
}

function bezier(p0, p1, p2, p3, steps) {
  const out = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    const k = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
    out.push([0, 1].map((a) => round(k[0] * p0[a] + k[1] * p1[a] + k[2] * p2[a] + k[3] * p3[a])));
  }
  return out;
}

// Junta trechos sem repetir o ponto de emenda.
function join(...parts) {
  const out = [];
  for (const part of parts) {
    for (const p of part) {
      const last = out.at(-1);
      if (!last || last[0] !== p[0] || last[1] !== p[1]) out.push(p);
    }
  }
  return out;
}

function round(v) {
  return Math.round(v * 1e6) / 1e6;
}
