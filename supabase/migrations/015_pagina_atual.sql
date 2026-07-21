-- Marca qual página, dentro de uma etapa de um funil, é a que está de fato
-- rodando no fluxo real — independente do status "Publicada" (que várias
-- páginas antigas/substituídas podem manter para sempre) e independente de
-- ter ou não teste A/B ativo (o marcador de A/B já resolvido não cobre
-- páginas publicadas fora de teste).

ALTER TABLE paginas
  ADD COLUMN IF NOT EXISTS pagina_atual BOOLEAN NOT NULL DEFAULT FALSE;
