// Ângulos da Hero são agrupados pela função psicológica que exercem na decisão
// (não pelo tipo de mensagem) — por isso o ícone é do grupo, não do ângulo
// individual. Ver explicação completa na conversa que definiu essa taxonomia.
//
// 🧠 Desejo         — "por que eu iria querer isso?" (motivação interna)
// ⚙️ Credibilidade  — "por que eu deveria acreditar nisso?" (reduz atrito)
// ⚡ Atenção        — "por que prestar atenção agora?" (interrompe o padrão)
// ⏱️ Tempo          — modificador transversal: "quando?"
// 🎯 Especificidade — modificador transversal: torna qualquer ângulo mais concreto
export const ANGULO_ICONE: Record<string, string> = {
  'Resultado': '🧠',
  'Dor / Problema': '🧠',
  'Identidade': '🧠',
  'Autoridade': '⚙️',
  'Prova Social': '⚙️',
  'Simplicidade': '⚙️',
  'Novidade': '⚙️',
  'Curiosidade': '⚡',
  'Urgência': '⚡',
  'Contraste / Injustiça': '⚡',
  'Acesso / Exclusividade': '⚡',
  'Tempo': '⏱️',
  'Especificidade': '🎯',
}

export function iconeAngulo(nome: string): string {
  return ANGULO_ICONE[nome] ?? ''
}
