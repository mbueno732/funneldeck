-- Suporte ao wizard "Criar Experimento A/B": quebra de hipótese, métrica/confiança,
-- divisão de tráfego por variante, screenshot e bucket de Storage.

ALTER TABLE testes_ab
  ADD COLUMN IF NOT EXISTS hipotese_motivo TEXT,
  ADD COLUMN IF NOT EXISTS resultado_esperado TEXT,
  ADD COLUMN IF NOT EXISTS metrica_primaria TEXT,
  ADD COLUMN IF NOT EXISTS nivel_confianca INTEGER DEFAULT 95,
  ADD COLUMN IF NOT EXISTS poder_estatistico INTEGER DEFAULT 80;

ALTER TABLE variantes_teste
  ADD COLUMN IF NOT EXISTS percentual_trafego NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS screenshot_url TEXT;

-- Bucket público para screenshots de variantes.
-- Upload sempre via service role key (mesmo padrão de escrita do resto do projeto),
-- então não é necessária policy de INSERT.
INSERT INTO storage.buckets (id, name, public)
VALUES ('teste-ab-screenshots', 'teste-ab-screenshots', true)
ON CONFLICT (id) DO NOTHING;

-- Listas configuráveis novas (mesmo padrão de etapa/prioridade/ferramenta)
INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('metrica_teste', 'Taxa de Conversão de Checkout', 1, true),
  ('metrica_teste', 'CTR do Botão Principal',        2, true),
  ('metrica_teste', 'Average Order Value (AOV)',      3, true),
  ('metrica_teste', 'Bounce Rate',                    4, true)
ON CONFLICT DO NOTHING;

INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('status_teste', 'Planejado',             1, true),
  ('status_teste', 'Ativo',                 2, true),
  ('status_teste', 'Finalizado',            3, true),
  ('status_teste', 'Vencedor implementado', 4, true)
ON CONFLICT DO NOTHING;
