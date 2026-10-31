// Fonte única dos sabores: rótulo da lata, seletor e cor de acento leem daqui.
// wave/hz desenham a onda do rótulo (hz / 22 = voltas da onda em torno da lata).
export const FLAVORS = [
  {
    id: 'original',
    name: 'Original',
    accent: '#C6FF00',
    code: 'N-01',
    note: 'Lima ácida com final cítrico e seco.',
    taste: 'Lima ácida',
    wave: 'square',
    hz: 440,
    ean: '789624010010',
  },
  {
    id: 'ice',
    name: 'Ice',
    accent: '#3DF2FF',
    code: 'N-02',
    note: 'Menta gelada e limão. Refresca até a última gota.',
    taste: 'Menta e limão',
    wave: 'sine',
    hz: 352,
    ean: '789624010027',
  },
  {
    id: 'berry',
    name: 'Berry',
    accent: '#FF3DCB',
    code: 'N-03',
    note: 'Frutas vermelhas, intenso e doce na medida.',
    taste: 'Frutas vermelhas',
    wave: 'saw',
    hz: 528,
    ean: '789624010034',
  },
];

export const DEFAULT_FLAVOR = 'original';

export const SPECS = { caffeine: '160MG', sugar: '0G', kcal: '10KCAL', volume: '473ML' };

export function getFlavor(id) {
  const flavor = FLAVORS.find((f) => f.id === id);
  if (!flavor) throw new Error(`Sabor desconhecido: ${id}`);
  return flavor;
}
