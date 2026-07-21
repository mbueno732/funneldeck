-- Layout (Curto/Longo) deixa de ser um campo do teste inteiro e passa a ser por variante —
-- testar página curta vs. longa é um dos testes CRO mais comuns, não faz sentido travar todas
-- as variantes no mesmo layout.

ALTER TABLE variantes_teste
  ADD COLUMN IF NOT EXISTS layout TEXT; -- 'curto' | 'longo'

-- testes_ab.layout fica no banco por compatibilidade com testes já criados, mas deixa de ser
-- preenchido por telas novas.
