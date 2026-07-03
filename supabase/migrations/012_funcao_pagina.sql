-- Tipos de função de página para o construtor estruturado de nomes
INSERT INTO configuracoes (categoria, valor, ordem, ativo) VALUES
  ('funcao_pagina', 'Captura',            1,  true),
  ('funcao_pagina', 'Inscrições Abertas', 2,  true),
  ('funcao_pagina', 'Lista de Espera',    3,  true),
  ('funcao_pagina', 'Obrigado',           4,  true),
  ('funcao_pagina', 'Vendas',             5,  true),
  ('funcao_pagina', 'OTO',                6,  true),
  ('funcao_pagina', 'Análise de Crédito', 7,  true),
  ('funcao_pagina', 'Compra Aprovada',    8,  true),
  ('funcao_pagina', 'Boleto Gerado',      9,  true),
  ('funcao_pagina', 'Aplicação',          10, true),
  ('funcao_pagina', 'Checkin',            11, true),
  ('funcao_pagina', 'Cadastro',           12, true),
  ('funcao_pagina', 'Material',           13, true)
ON CONFLICT DO NOTHING;
