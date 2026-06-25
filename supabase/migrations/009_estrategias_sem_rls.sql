-- Garante schema correto da tabela estrategias (criada fora do sistema de migrations)
CREATE TABLE IF NOT EXISTS estrategias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funil_id UUID NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  caminho_url TEXT,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Desabilita RLS para garantir acesso total via service role key
ALTER TABLE estrategias DISABLE ROW LEVEL SECURITY;

-- Remove todas as políticas existentes (se houver) para evitar conflitos
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'estrategias' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON estrategias', pol.policyname);
  END LOOP;
END $$;

-- Índices
CREATE INDEX IF NOT EXISTS idx_estrategias_funil ON estrategias(funil_id);
CREATE INDEX IF NOT EXISTS idx_paginas_estrategia ON paginas(estrategia_id);
