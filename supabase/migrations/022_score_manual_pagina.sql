-- Permite registrar um score manual por página quando o GTmetrix não consegue
-- analisar (páginas muito grandes) — complementa a análise automática, nunca
-- a substitui: se existir gtmetrix_grade, ele sempre prevalece na exibição.
ALTER TABLE paginas
  ADD COLUMN IF NOT EXISTS score_manual_grade TEXT,
  ADD COLUMN IF NOT EXISTS score_manual_pct INTEGER,
  ADD COLUMN IF NOT EXISTS score_manual_nota TEXT,
  ADD COLUMN IF NOT EXISTS score_manual_data DATE;
