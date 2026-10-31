// Código de barras EAN-13 de verdade: dígito verificador e os 95 módulos (1 = barra).
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const G = L.map((code) => [...code].reverse().map((b) => (b === '1' ? '0' : '1')).join(''));
const R = L.map((code) => [...code].map((b) => (b === '1' ? '0' : '1')).join(''));
// O primeiro dígito não vira barra: ele escolhe a paridade (L ou G) dos seis seguintes.
const PARITY = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

export function ean13CheckDigit(digits) {
  if (!/^\d{12}$/.test(digits)) throw new Error('O EAN-13 precisa de 12 dígitos antes do verificador');
  const sum = [...digits].reduce((acc, d, i) => acc + Number(d) * (i % 2 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10;
}

export function ean13(digits) {
  return digits + ean13CheckDigit(digits);
}

export function ean13Modules(code) {
  if (!/^\d{13}$/.test(code)) throw new Error('O EAN-13 precisa de 13 dígitos');
  if (ean13CheckDigit(code.slice(0, 12)) !== Number(code[12])) throw new Error(`Dígito verificador inválido: ${code}`);
  const d = [...code].map(Number);
  const parity = PARITY[d[0]];
  const left = d.slice(1, 7).map((n, i) => (parity[i] === 'L' ? L : G)[n]).join('');
  const right = d.slice(7).map((n) => R[n]).join('');
  return `101${left}01010${right}101`;
}
