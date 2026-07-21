-- Vínculo de página por VARIANTE (não mais um único pagina_id no teste inteiro).
-- Motivo: um teste com 2+ variantes pode envolver páginas diferentes do Mapa de Páginas
-- (ex: página-variante A e página-variante B já cadastradas) — o indicador "teste ativo"
-- precisa acender em todas elas, não só numa página "canônica" do teste.
--
-- Obrigatório a partir da tela de Cadastro (validado em lib/actions/testes-ab.ts), mas a
-- coluna fica NULLABLE no banco pra não quebrar testes já existentes sem esse vínculo.

ALTER TABLE variantes_teste
  ADD COLUMN IF NOT EXISTS pagina_id UUID REFERENCES paginas(id);

CREATE INDEX IF NOT EXISTS idx_variantes_teste_pagina ON variantes_teste(pagina_id);

-- testes_ab.pagina_id (campo "Página testada" antigo) fica no banco por compatibilidade
-- com testes já criados, mas deixa de ser preenchido por telas novas.
