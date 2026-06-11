-- Migration 005 — Adiciona ON DELETE CASCADE nas FK que referenciam paginas
-- Sem isso, deletar uma pagina que tenha registros em migracoes ou testes_ab falha silenciosamente

-- migracoes.pagina_id
ALTER TABLE migracoes
  DROP CONSTRAINT IF EXISTS migracoes_pagina_id_fkey,
  ADD CONSTRAINT migracoes_pagina_id_fkey
    FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE CASCADE;

-- testes_ab.pagina_id (adicionado em 004 sem cascade)
ALTER TABLE testes_ab
  DROP CONSTRAINT IF EXISTS testes_ab_pagina_id_fkey,
  ADD CONSTRAINT testes_ab_pagina_id_fkey
    FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE SET NULL;
