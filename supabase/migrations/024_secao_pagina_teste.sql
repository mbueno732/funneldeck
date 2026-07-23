-- "Seção da Página" — eixo puramente posicional (Topo/Hero/Meio/Fim/Rodapé/
-- Overlay/Página inteira), separado de Elemento Testado (que é o eixo
-- funcional: Headline, CTA, Oferta, Prova Social...). Os dois juntos, sem
-- sobreposição, permitem cruzar depois "Elemento X venceu mais em qual
-- Seção" — a pergunta não existe se os dois eixos misturarem posição com
-- função no mesmo campo.
--
-- Nível de teste (não de variante) — a seção testada normalmente não muda
-- entre Controle e Variação, mesmo princípio do Elemento Testado.

ALTER TABLE testes_ab
  ADD COLUMN IF NOT EXISTS secao_pagina TEXT;

INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('secao_pagina', 'Topo',           1, true),
  ('secao_pagina', 'Hero',           2, true),
  ('secao_pagina', 'Meio',           3, true),
  ('secao_pagina', 'Fim',            4, true),
  ('secao_pagina', 'Rodapé',         5, true),
  ('secao_pagina', 'Overlay',        6, true),
  ('secao_pagina', 'Página inteira', 7, true)
ON CONFLICT DO NOTHING;
