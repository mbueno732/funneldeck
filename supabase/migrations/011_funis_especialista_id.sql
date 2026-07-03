-- Adiciona especialista_id à tabela funis para persistir a associação direta
-- sem depender do produto_id (que pode ser nulo em funis de aquisição)
ALTER TABLE funis
  ADD COLUMN IF NOT EXISTS especialista_id UUID REFERENCES especialistas(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_funis_especialista ON funis(especialista_id);
