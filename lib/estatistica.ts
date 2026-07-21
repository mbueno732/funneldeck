// Teste-z de duas proporções (bicaudal) — mesma fórmula usada na planilha original do Marcelo.
function erf(x: number): number {
  const sinal = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return sinal * y
}

function phi(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)))
}

/** cvrControle/cvrVariante em percentual (ex: 14.1), nControle/nVariante = sessões de cada. */
export function confiancaZTest(cvrControle: number, nControle: number, cvrVariante: number, nVariante: number): number | null {
  if (nControle <= 0 || nVariante <= 0) return null
  const pC = cvrControle / 100
  const pV = cvrVariante / 100
  const variancia = (pV * (1 - pV)) / nVariante + (pC * (1 - pC)) / nControle
  if (variancia <= 0) return null
  const z = Math.abs(pV - pC) / Math.sqrt(variancia)
  const confianca = (1 - 2 * (1 - phi(z))) * 100
  return Math.max(0, Math.min(100, confianca))
}

export function classificarConfianca(confianca: number): 'Alta' | 'Média' | 'Baixa' {
  if (confianca >= 90) return 'Alta'
  if (confianca >= 80) return 'Média'
  return 'Baixa'
}

export const MIN_CONVERSOES_CONFIAVEL = 100
export const MIN_DIAS_RECOMENDADO = 7
