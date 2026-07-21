-- Guarda a URL de ativação do teste A/B (a URL "raiz" que o redirecionador de
-- split-test usa) de forma editável — o valor default é calculado a partir da
-- URL das variantes, mas pode ser corrigido manualmente no Cadastro quando o
-- cálculo automático sai errado (ex: estrutura de URL fora do padrão comum).
ALTER TABLE testes_ab
  ADD COLUMN IF NOT EXISTS url_ativacao TEXT;
