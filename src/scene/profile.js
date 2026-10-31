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
