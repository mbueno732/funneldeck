-- Distingue "nunca entrou em veiculação" de "já esteve em veiculação, está fora agora" —
-- hoje pagina_atual=false é o mesmo valor nos dois casos, sem jeito de diferenciar.
--
-- Flag de "set uma vez, nunca desliga sozinha": vira true na primeira vez que a página entra em
-- veiculação (lib/actions/paginas.ts) e nunca mais volta pra false automaticamente. É o que
-- permite a coluna Veiculação mostrar 3 estados: Em veiculação / Veiculação pausada / Nunca
-- veiculada.

ALTER TABLE paginas
  ADD COLUMN IF NOT EXISTS ja_esteve_em_veiculacao BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill: páginas que já estão em veiculação agora obviamente já estiveram.
UPDATE paginas SET ja_esteve_em_veiculacao = TRUE WHERE pagina_atual = TRUE;
