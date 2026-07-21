-- Métricas de sucesso específicas para testes A/B em funis de Aquisição.
-- A categoria 'metrica_teste' (migration 013) segue existindo, mas passa a ser
-- interpretada como "métricas de Vendas" no wizard — testes em funis com
-- objetivo = 'Aquisição' usam esta nova categoria em vez daquela.
-- Só métricas que se encaixam no mecanismo genérico já rastreado em
-- variantes_teste (sessoes/conversoes) — nada que exija dado que não coletamos
-- (custo de anúncio, score qualitativo de lead).

INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('metrica_teste_aquisicao', 'Taxa de Conversão da Landing Page (LP CR)', 1, true),
  ('metrica_teste_aquisicao', 'CTR (Click-Through Rate)',                  2, true),
  ('metrica_teste_aquisicao', 'Taxa de Conversão de Cadastro/Lead',        3, true)
ON CONFLICT DO NOTHING;
