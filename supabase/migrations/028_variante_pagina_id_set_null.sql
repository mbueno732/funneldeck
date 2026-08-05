-- variantes_teste.pagina_id (migration 017) nunca recebeu ON DELETE, diferente de
-- testes_ab.pagina_id e migracoes.pagina_id (corrigidas na migration 005). Isso bloqueia a
-- exclusão de qualquer página que já tenha sido vinculada a uma variante de teste A/B — o
-- Postgres recusa o DELETE em vez de simplesmente desvincular.
--
-- SET NULL (não CASCADE): perder a página não deve apagar o teste/variante, só desvincular —
-- mesmo comportamento já usado em testes_ab.pagina_id, e a coluna já era nullable.

ALTER TABLE variantes_teste
  DROP CONSTRAINT IF EXISTS variantes_teste_pagina_id_fkey,
  ADD CONSTRAINT variantes_teste_pagina_id_fkey
    FOREIGN KEY (pagina_id) REFERENCES paginas(id) ON DELETE SET NULL;
