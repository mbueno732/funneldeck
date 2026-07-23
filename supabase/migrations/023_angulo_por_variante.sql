-- Move o Ângulo da Hero de nível de teste (testes_ab.angulos) pra nível de
-- variante — cada variante pode ter uma hero diferente, então o ângulo
-- também precisa ser por variante. Mesmo princípio já aplicado ao Layout
-- (migration 019).
--
-- Um ângulo dominante (obrigatório quando há ângulos) + até 2 secundários,
-- em vez de uma lista plana — permite destacar visualmente qual ângulo é o
-- principal da variante nas telas de Lista/Detalhe/Dashboard.

ALTER TABLE variantes_teste
  ADD COLUMN IF NOT EXISTS angulo_dominante TEXT,
  ADD COLUMN IF NOT EXISTS angulos_secundarios TEXT[];

-- testes_ab.angulos não é dropada (mantém compatibilidade com testes já
-- criados antes desta mudança), mas deixa de ser preenchida por telas novas.
