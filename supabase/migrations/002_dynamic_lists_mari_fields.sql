-- Migration 002 — Dynamic Lists + Mari's Fields
-- Drops enum-based schema and rebuilds with configurable lists

-- Step 1: Drop all tables in reverse dependency order
DROP TABLE IF EXISTS historico_alteracoes CASCADE;
DROP TABLE IF EXISTS checklist_itens CASCADE;
DROP TABLE IF EXISTS checklists_publicacao CASCADE;
DROP TABLE IF EXISTS variantes_teste CASCADE;
DROP TABLE IF EXISTS testes_ab CASCADE;
DROP TABLE IF EXISTS migracoes CASCADE;
DROP TABLE IF EXISTS paginas CASCADE;
DROP TABLE IF EXISTS funis CASCADE;
DROP TABLE IF EXISTS produtos CASCADE;
DROP TABLE IF EXISTS especialistas CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;
DROP TABLE IF EXISTS configuracoes CASCADE;

-- Step 2: Drop old enum types
DROP TYPE IF EXISTS perfil_usuario CASCADE;
DROP TYPE IF EXISTS status_especialista CASCADE;
DROP TYPE IF EXISTS status_produto CASCADE;
DROP TYPE IF EXISTS tipo_funil CASCADE;
DROP TYPE IF EXISTS status_funil CASCADE;
DROP TYPE IF EXISTS tipo_pagina CASCADE;
DROP TYPE IF EXISTS plataforma_pagina CASCADE;
DROP TYPE IF EXISTS status_pagina CASCADE;
DROP TYPE IF EXISTS prioridade_pagina CASCADE;
DROP TYPE IF EXISTS status_migracao CASCADE;
DROP TYPE IF EXISTS status_teste CASCADE;

-- Step 3: Re-create perfil_usuario enum (kept — fixed business rule)
CREATE TYPE perfil_usuario AS ENUM ('editor', 'visualizador');

-- Step 4: Configuracoes — todas as listas editáveis em uma tabela
CREATE TABLE configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    categoria TEXT NOT NULL,
    valor TEXT NOT NULL,
    cor TEXT,
    ordem INT NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(categoria, valor)
);

-- Valores padrão
INSERT INTO configuracoes (categoria, valor, cor, ordem) VALUES
    -- Tipos de Funil
    ('tipo_funil', 'Lançamento',    NULL,      1),
    ('tipo_funil', 'Evergreen',     NULL,      2),
    ('tipo_funil', 'Ongoing',       NULL,      3),
    ('tipo_funil', 'Webinar',       NULL,      4),
    ('tipo_funil', 'Evento',        NULL,      5),
    ('tipo_funil', 'Outro',         NULL,      6),

    -- Status do Funil
    ('status_funil', 'Ativo',       '#22c55e', 1),
    ('status_funil', 'Pausado',     '#f97316', 2),
    ('status_funil', 'Inativo',     '#6b7280', 3),

    -- Etapas da Página
    ('etapa', 'Captura',            NULL,      1),
    ('etapa', 'Vendas',             NULL,      2),
    ('etapa', 'TYP',                NULL,      3),
    ('etapa', 'OTO',                NULL,      4),
    ('etapa', 'Auxiliares',         NULL,      5),

    -- Ferramentas (substitui plataforma)
    ('ferramenta', 'Framer',        NULL,      1),
    ('ferramenta', 'Dev Interno',   NULL,      2),
    ('ferramenta', 'Elementor',     NULL,      3),
    ('ferramenta', 'Webflow',       NULL,      4),
    ('ferramenta', 'Outro',         NULL,      5),

    -- Status da Página
    ('status_pagina', 'A fazer',      '#6b7280', 1),
    ('status_pagina', 'Em andamento', '#eab308', 2),
    ('status_pagina', 'Implementada', '#3b82f6', 3),
    ('status_pagina', 'Pausada',      '#f97316', 4),
    ('status_pagina', 'Publicada',    '#22c55e', 5),
    ('status_pagina', 'Suspensa',     '#ef4444', 6),

    -- Nível de Prioridade
    ('prioridade', 'Prioridade 1',  '#ef4444', 1),
    ('prioridade', 'Prioridade 2',  '#f97316', 2),
    ('prioridade', 'Prioridade 3',  '#6b7280', 3);

-- Step 5: Core tables

CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    perfil perfil_usuario NOT NULL DEFAULT 'visualizador',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE especialistas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    especialista_id UUID NOT NULL REFERENCES especialistas(id),
    nome TEXT NOT NULL,
    descricao TEXT,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE funis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES produtos(id),
    id_funil TEXT,
    nome TEXT NOT NULL,
    tipo TEXT NOT NULL,
    responsavel_cro TEXT,
    responsavel_dev TEXT,
    status TEXT NOT NULL DEFAULT 'Ativo',
    data_ativacao DATE,
    planilha_leads TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE paginas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funil_id UUID NOT NULL REFERENCES funis(id),
    nome TEXT NOT NULL,
    etapa TEXT,
    url_pagina TEXT,
    referencia_dev TEXT,
    ferramenta TEXT,
    status TEXT NOT NULL DEFAULT 'A fazer',
    prioridade TEXT,
    responsavel TEXT,
    horas_estimadas NUMERIC,
    horas_reais NUMERIC,
    data_prevista DATE,
    ab_test BOOLEAN NOT NULL DEFAULT FALSE,
    url_variacao_a TEXT,
    url_variacao_b TEXT,
    url_planilha_leads TEXT,
    url_planilha_pesquisa TEXT,
    url_documentacao TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE historico_status_pagina (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagina_id UUID NOT NULL REFERENCES paginas(id) ON DELETE CASCADE,
    status_anterior TEXT,
    status_novo TEXT NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checklists_publicacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagina_id UUID NOT NULL REFERENCES paginas(id) ON DELETE CASCADE UNIQUE,
    vsl_ativo BOOLEAN NOT NULL DEFAULT FALSE,
    observacao_geral TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checklist_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    checklist_id UUID NOT NULL REFERENCES checklists_publicacao(id) ON DELETE CASCADE,
    fase TEXT NOT NULL,
    item TEXT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    ordem INT NOT NULL DEFAULT 0
);

CREATE TABLE testes_ab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funil_id UUID NOT NULL REFERENCES funis(id),
    nome TEXT NOT NULL,
    hipotese TEXT,
    objetivo TEXT,
    responsavel TEXT,
    status TEXT NOT NULL DEFAULT 'Planejado',
    data_inicio DATE,
    data_fim DATE,
    resultado TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE variantes_teste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teste_id UUID NOT NULL REFERENCES testes_ab(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    url_variante TEXT,
    descricao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE historico_alteracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidade TEXT NOT NULL,
    entidade_id UUID NOT NULL,
    usuario_id UUID REFERENCES usuarios(id),
    acao TEXT NOT NULL,
    detalhes JSONB,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 6: Indexes
CREATE INDEX idx_paginas_funil     ON paginas(funil_id);
CREATE INDEX idx_paginas_status    ON paginas(status);
CREATE INDEX idx_paginas_ferramenta ON paginas(ferramenta);
CREATE INDEX idx_funis_produto     ON funis(produto_id);
CREATE INDEX idx_funis_status      ON funis(status);
CREATE INDEX idx_produtos_especialista ON produtos(especialista_id);
CREATE INDEX idx_testes_funil      ON testes_ab(funil_id);
CREATE INDEX idx_hist_status_pagina ON historico_status_pagina(pagina_id);
CREATE INDEX idx_checklist_itens   ON checklist_itens(checklist_id);
CREATE INDEX idx_historico_entidade ON historico_alteracoes(entidade, entidade_id);
CREATE INDEX idx_configuracoes_cat ON configuracoes(categoria, ativo);

-- Step 7: Trigger — auto-create checklist when page reaches "Implementada"
CREATE OR REPLACE FUNCTION criar_checklist_implementada()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_checklist_id UUID;
BEGIN
    IF NEW.status = 'Implementada' AND (OLD IS NULL OR OLD.status IS DISTINCT FROM 'Implementada') THEN
        IF NOT EXISTS (SELECT 1 FROM checklists_publicacao WHERE pagina_id = NEW.id) THEN
            INSERT INTO checklists_publicacao (pagina_id)
            VALUES (NEW.id)
            RETURNING id INTO v_checklist_id;

            INSERT INTO checklist_itens (checklist_id, fase, item, ordem) VALUES
                (v_checklist_id, 'setup',         'URL da página definida e configurada',              1),
                (v_checklist_id, 'setup',         'Meta description incluída',                         2),
                (v_checklist_id, 'setup',         'Social preview (OG image) configurada',             3),
                (v_checklist_id, 'setup',         'Favicon do funil incluído',                         4),
                (v_checklist_id, 'setup',         'Analytics conectado (GA4, GTM ou Pixel)',           5),
                (v_checklist_id, 'desenvolvimento','Layout responsivo revisado (mobile e desktop)',    1),
                (v_checklist_id, 'desenvolvimento','Imagens em formato otimizado (WebP)',              2),
                (v_checklist_id, 'desenvolvimento','Formulário(s) configurado(s) e integração ativa', 3),
                (v_checklist_id, 'desenvolvimento','Integrações ativas (CRM, ActiveCampaign, etc.)',  4),
                (v_checklist_id, 'desenvolvimento','Parâmetros UTM sendo capturados',                 5),
                (v_checklist_id, 'testes',        'Todos os botões de CTA testados',                  1),
                (v_checklist_id, 'testes',        'Todos os links testados',                          2),
                (v_checklist_id, 'testes',        'Formulário de conversão testado com dado real',    3),
                (v_checklist_id, 'testes',        'Teste real no celular físico',                     4),
                (v_checklist_id, 'performance',   'GTmetrix executado',                               1),
                (v_checklist_id, 'performance',   'Otimizações aplicadas se necessário',              2);
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_checklist_implementada
    AFTER INSERT OR UPDATE OF status ON paginas
    FOR EACH ROW EXECUTE FUNCTION criar_checklist_implementada();

-- Step 8: Trigger — record status history on every page status change
CREATE OR REPLACE FUNCTION registrar_historico_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO historico_status_pagina (pagina_id, status_anterior, status_novo)
        VALUES (NEW.id, NULL, NEW.status);
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO historico_status_pagina (pagina_id, status_anterior, status_novo)
        VALUES (NEW.id, OLD.status, NEW.status);
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_historico_status
    AFTER INSERT OR UPDATE OF status ON paginas
    FOR EACH ROW EXECUTE FUNCTION registrar_historico_status();

-- Step 9: Trigger — sync auth.users → usuarios
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.usuarios (id, nome, email, perfil)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'perfil')::perfil_usuario, 'visualizador')
    );
    RETURN NEW;
END;
$$;

-- Step 10: RLS
ALTER TABLE usuarios              ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialistas         ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos              ENABLE ROW LEVEL SECURITY;
ALTER TABLE funis                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE paginas               ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_status_pagina ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists_publicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_itens       ENABLE ROW LEVEL SECURITY;
ALTER TABLE testes_ab             ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_teste       ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_alteracoes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracoes         ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer autenticado
CREATE POLICY "select" ON especialistas         FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON produtos              FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON funis                 FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON paginas               FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON historico_status_pagina FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON checklists_publicacao FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON checklist_itens       FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON testes_ab             FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON variantes_teste       FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON historico_alteracoes  FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON configuracoes         FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "select" ON usuarios              FOR SELECT TO authenticated USING (TRUE);

-- Escrita: somente editores
CREATE POLICY "editor_write" ON especialistas FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON produtos FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON funis FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON paginas FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON checklists_publicacao FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON checklist_itens FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON testes_ab FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON variantes_teste FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON configuracoes FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editor_write" ON historico_status_pagina FOR INSERT TO authenticated WITH CHECK (TRUE);

-- Service role pode inserir em usuarios (necessário para o trigger de auth)
CREATE POLICY "service_role_insert" ON usuarios FOR INSERT TO service_role WITH CHECK (TRUE);
