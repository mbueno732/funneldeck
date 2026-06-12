-- Migration 008 — Campo nao_se_aplica em checklist_itens
-- Permite marcar itens do checklist como "não se aplica" para esta página.
-- Itens N/A são excluídos do cálculo do percentual de conclusão.

ALTER TABLE checklist_itens
  ADD COLUMN IF NOT EXISTS nao_se_aplica BOOLEAN NOT NULL DEFAULT FALSE;
