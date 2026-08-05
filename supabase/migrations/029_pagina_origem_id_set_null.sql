-- paginas.pagina_origem_id (sistema de variantes — CLAUDE.md menciona a coluna, mas ela nunca
-- passou por uma migration controlada, foi criada direto no banco em algum momento — mesma
-- armadilha já documentada pra tabela `estrategias`). Sem ON DELETE definido, o Postgres bloqueia
-- a exclusão de qualquer página que seja "origem" de uma variante criada a partir dela.
--
-- Usa um bloco dinâmico porque não sabemos o nome exato da constraint (não foi criada por uma
-- migration nossa) — descobre a FK auto-referenciada em paginas e recria com ON DELETE SET NULL.

DO $$
DECLARE
  nome_constraint text;
BEGIN
  SELECT conname INTO nome_constraint
  FROM pg_constraint
  WHERE conrelid = 'paginas'::regclass
    AND confrelid = 'paginas'::regclass
    AND contype = 'f';

  IF nome_constraint IS NOT NULL THEN
    EXECUTE format('ALTER TABLE paginas DROP CONSTRAINT %I', nome_constraint);
  END IF;

  ALTER TABLE paginas
    ADD CONSTRAINT paginas_pagina_origem_id_fkey
      FOREIGN KEY (pagina_origem_id) REFERENCES paginas(id) ON DELETE SET NULL;
END $$;
