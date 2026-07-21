-- Permite encerrar um teste A/B sem declarar vencedora (empate/inconclusivo),
-- em vez de deixá-lo "Ativo" pra sempre quando o resultado não é claro.
ALTER TABLE testes_ab
  ADD COLUMN IF NOT EXISTS resultado_final TEXT
    CHECK (resultado_final IN ('vencedora', 'sem_vencedor'));
