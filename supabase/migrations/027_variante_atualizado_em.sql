-- Permite mostrar "dados atualizados há Xd" na Lista de Experimentos. Hoje não existe nenhum
-- registro de quando sessões/conversões/receita de uma variante foram digitadas pela última vez —
-- variantes_teste só tem criado_em, que fica travado na data de criação do teste.

ALTER TABLE variantes_teste
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Não é mantido por trigger de propósito: só atualizarMetricasVariante() deve tocar essa coluna,
-- pra ela responder especificamente "há quanto tempo os números foram atualizados", não qualquer
-- edição do teste (headline, hipótese, etc.).
