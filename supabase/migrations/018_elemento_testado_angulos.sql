-- Suporte à frase de hipótese consolidada automática (pedido do Marcelo, baseado na fórmula que
-- ele já usava no Sheets): "Se eu testar {elemento} com ângulo de X, Y, Z no {segmento}, então
-- {métrica} vai aumentar, porque esse público tem características específicas."

-- Ângulos deixam de ter distinção Primário/Secundário — vira uma lista única, até 3, sem hierarquia.
ALTER TABLE testes_ab
  ADD COLUMN IF NOT EXISTS angulos TEXT[];
-- angulo_primario / angulos_secundarios ficam no banco por compatibilidade com testes já criados,
-- mas deixam de ser preenchidos por telas novas.

-- Elemento testado (reaproveita conceito já mapeado, mas precisa de uma lista configurável nova
-- — testes_ab.elemento_testado já existe desde a migration 004, nunca foi usado até agora).
INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('elemento_testado', 'Headline',      1, true),
  ('elemento_testado', 'Subheadline',   2, true),
  ('elemento_testado', 'CTA',           3, true),
  ('elemento_testado', 'Estrutura',     4, true),
  ('elemento_testado', 'Oferta',        5, true),
  ('elemento_testado', 'Preço',         6, true),
  ('elemento_testado', 'Prova Social',  7, true),
  ('elemento_testado', 'Formulário',    8, true),
  ('elemento_testado', 'Imagem/Vídeo',  9, true)
ON CONFLICT DO NOTHING;
