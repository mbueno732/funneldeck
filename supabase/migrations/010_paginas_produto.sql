-- Migration 010: Páginas de Produto
-- Permite que páginas pertençam diretamente a um produto (sem funil)
-- Ex: Página de Vendas, Página de Indicação — reaproveitadas em todos os lançamentos

-- funil_id deixa de ser obrigatório
ALTER TABLE paginas ALTER COLUMN funil_id DROP NOT NULL;

-- nova coluna produto_id
ALTER TABLE paginas ADD COLUMN IF NOT EXISTS produto_id UUID
  REFERENCES produtos(id) ON DELETE SET NULL;

-- pelo menos um dos dois deve estar preenchido
ALTER TABLE paginas ADD CONSTRAINT paginas_escopo_check
  CHECK (funil_id IS NOT NULL OR produto_id IS NOT NULL);

-- índice para buscas por produto
CREATE INDEX IF NOT EXISTS idx_paginas_produto ON paginas(produto_id);
