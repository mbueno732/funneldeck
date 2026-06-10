-- Migration 003 — Remove A/B fields from pages + remove url_planilha_leads from pages
-- A/B tests belong to the testes_ab module only
-- planilha_leads already exists at the funnel level

ALTER TABLE paginas DROP COLUMN IF EXISTS ab_test;
ALTER TABLE paginas DROP COLUMN IF EXISTS url_variacao_a;
ALTER TABLE paginas DROP COLUMN IF EXISTS url_variacao_b;
ALTER TABLE paginas DROP COLUMN IF EXISTS url_planilha_leads;
