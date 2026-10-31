// Formas de onda do rótulo: cada sabor tem a sua "frequência" dando a volta na lata.
// waveSample devolve -1..1 para uma fase 0..1; wavePoints monta a polilinha já com as
// quinas verticais, fechando no mesmo ponto em que começa (a lata não tem emenda).
const SAMPLERS = {
  square: (p) => (p < 0.5 ? 1 : -1),
  sine: (p) => Math.sin(p * Math.PI * 2),
  saw: (p) => -1 + 2 * p,
};

export function waveSample(kind, phase) {
  const sample = SAMPLERS[kind];
  if (!sample) throw new Error(`Onda desconhecida: ${kind}`);
  return sample(phase - Math.floor(phase));
}

export function wavePoints(kind, { width, cycles, amplitude, stepsPerCycle = 32 }) {
  waveSample(kind, 0); // valida o tipo
  if (!Number.isInteger(cycles) || cycles < 1) throw new Error('O número de ciclos precisa ser inteiro');
  const period = width / cycles;
  const a = amplitude;
  const points = [];

  for (let c = 0; c < cycles; c++) {
    const x = c * period;
    if (kind === 'square') {
      points.push([x, a], [x + period / 2, a], [x + period / 2, -a], [x + period, -a]);
    } else if (kind === 'saw') {
      points.push([x, -a], [x + period, a]);
    } else {
      for (let i = 0; i < stepsPerCycle; i++) {
        const t = i / stepsPerCycle;
        points.push([x + t * period, a * Math.sin(t * Math.PI * 2)]);
      }
    }
  }
  // Fecha no valor inicial; nas ondas com quina isso desenha a borda vertical final.
  points.push([width, points[0][1]]);
  return points;
}
