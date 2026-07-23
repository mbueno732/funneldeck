-- A tabela campanhas (migration 016) nunca teve RLS ativado — esquecimento
-- na hora de criar a tabela, não uma decisão deliberada. Descoberta na mesma
-- auditoria que achou o problema em estrategias (025): a anon key pública
-- conseguia ler todas as campanhas direto pela API do Supabase.
--
-- Mesmo padrão de todas as outras tabelas: ativa RLS sem nenhuma policy
-- (deny-all pra anon/authenticated). O app usa service role key no servidor,
-- que ignora RLS — zero impacto no funcionamento.
ALTER TABLE campanhas ENABLE ROW LEVEL SECURITY;
