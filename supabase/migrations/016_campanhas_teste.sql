-- Suporte à tela de Cadastro do Teste redesenhada no Stitch: Campanha (pode abranger mais de um
-- funil), Segmento (público/temperatura de tráfego), Especialista, Layout, código auto-gerado,
-- Assistente de Hipótese (ângulo primário/secundários) e conteúdo de variação (headline/preview).
-- Obs: `testes_ab.responsavel` já existe desde a migration 001 — não recriar.

CREATE TABLE IF NOT EXISTS campanhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL,             -- "D90", "Passari_abr.26"
  data_inicio DATE,
  data_fim DATE,                    -- null = campanha aberta/evergreen
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- SEM funil_id fixo — uma campanha pode abranger vários funis (ex: "D90" tocando aquisição e
-- vendas do mesmo lançamento). Quem liga campanha a funil é testes_ab.campanha_id.

ALTER TABLE testes_ab
  ADD COLUMN IF NOT EXISTS campanha_id UUID REFERENCES campanhas(id),
  ADD COLUMN IF NOT EXISTS segmento TEXT,                    -- Geral|Orgânico|Quente|Frio|Amplo
  ADD COLUMN IF NOT EXISTS especialista_id UUID REFERENCES especialistas(id),
  ADD COLUMN IF NOT EXISTS layout TEXT,                      -- 'curto' | 'medio' | 'longo' — nível do teste
  ADD COLUMN IF NOT EXISTS codigo TEXT,                      -- auto-gerado: "{seq}_{Segmento}_{Campanha}"
  ADD COLUMN IF NOT EXISTS angulo_primario TEXT,
  ADD COLUMN IF NOT EXISTS angulos_secundarios TEXT[];

ALTER TABLE variantes_teste
  ADD COLUMN IF NOT EXISTS headline TEXT,
  ADD COLUMN IF NOT EXISTS subheadline TEXT,
  ADD COLUMN IF NOT EXISTS url_preview TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_testes_ab_codigo ON testes_ab(codigo) WHERE codigo IS NOT NULL;

-- Listas configuráveis novas (mesmo padrão de etapa/prioridade/ferramenta) — editáveis depois em
-- Configurações, essa é só a semente inicial.
INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('segmento_teste', 'Geral',     1, true),
  ('segmento_teste', 'Orgânico',  2, true),
  ('segmento_teste', 'Quente',    3, true),
  ('segmento_teste', 'Frio',      4, true),
  ('segmento_teste', 'Amplo',     5, true)
ON CONFLICT DO NOTHING;

INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('angulo_hero', 'Resultado',      1,  true),
  ('angulo_hero', 'Simplicidade',   2,  true),
  ('angulo_hero', 'Especificidade', 3,  true),
  ('angulo_hero', 'Urgência',       4,  true),
  ('angulo_hero', 'Prova Social',   5,  true),
  ('angulo_hero', 'Autoridade',     6,  true),
  ('angulo_hero', 'Curiosidade',    7,  true),
  ('angulo_hero', 'Escassez',       8,  true),
  ('angulo_hero', 'Ganho',          9,  true),
  ('angulo_hero', 'Perda',          10, true),
  ('angulo_hero', 'Lógica',         11, true),
  ('angulo_hero', 'Garantia',       12, true)
ON CONFLICT DO NOTHING;
