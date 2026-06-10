-- Hub Operacional de Funis e CRO
-- Migration 001 — Schema Inicial

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Enum types
CREATE TYPE perfil_usuario AS ENUM ('editor', 'visualizador');
CREATE TYPE status_especialista AS ENUM ('ativo', 'inativo');
CREATE TYPE status_produto AS ENUM ('ativo', 'inativo');
CREATE TYPE tipo_funil AS ENUM ('lancamento','perpetuo','ongoing','webinar','evento','outro');
CREATE TYPE status_funil AS ENUM ('planejamento','ativo','pausado','encerrado');
CREATE TYPE tipo_pagina AS ENUM ('captura','obrigado','vsl','checkout','upsell','downsell','webinar','replay','outro');
CREATE TYPE plataforma_pagina AS ENUM ('script','framer','elementor','outro');
CREATE TYPE status_pagina AS ENUM ('backlog','desenvolvimento','implementacao','publicada');
CREATE TYPE prioridade_pagina AS ENUM ('alta','media','baixa');
CREATE TYPE status_migracao AS ENUM ('nao_iniciado','em_andamento','concluido');
CREATE TYPE status_teste AS ENUM ('planejado','ativo','finalizado','vencedor_implementado');

-- Tabelas
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
    status status_especialista NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    especialista_id UUID NOT NULL REFERENCES especialistas(id),
    nome TEXT NOT NULL,
    descricao TEXT,
    status status_produto NOT NULL DEFAULT 'ativo',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE funis (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID NOT NULL REFERENCES produtos(id),
    nome TEXT NOT NULL,
    tipo tipo_funil NOT NULL,
    responsavel_cro TEXT,
    responsavel_dev TEXT,
    status status_funil NOT NULL DEFAULT 'planejamento',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE paginas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funil_id UUID NOT NULL REFERENCES funis(id),
    nome TEXT NOT NULL,
    url_pagina TEXT,
    tipo tipo_pagina NOT NULL,
    plataforma plataforma_pagina NOT NULL,
    status status_pagina NOT NULL DEFAULT 'backlog',
    prioridade prioridade_pagina NOT NULL DEFAULT 'media',
    responsavel TEXT,
    url_planilha_leads TEXT,
    url_planilha_pesquisa TEXT,
    url_documentacao TEXT,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE migracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagina_id UUID NOT NULL REFERENCES paginas(id),
    status status_migracao NOT NULL DEFAULT 'nao_iniciado',
    data_migracao DATE,
    observacoes TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE checklists_publicacao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pagina_id UUID NOT NULL REFERENCES paginas(id),
    item TEXT NOT NULL,
    concluido BOOLEAN NOT NULL DEFAULT FALSE,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE testes_ab (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    funil_id UUID NOT NULL REFERENCES funis(id),
    nome TEXT NOT NULL,
    hipotese TEXT,
    objetivo TEXT,
    responsavel TEXT,
    status status_teste NOT NULL DEFAULT 'planejado',
    data_inicio DATE,
    data_fim DATE,
    resultado TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE variantes_teste (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teste_id UUID NOT NULL REFERENCES testes_ab(id),
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

-- Índices
CREATE INDEX idx_paginas_funil ON paginas(funil_id);
CREATE INDEX idx_paginas_status ON paginas(status);
CREATE INDEX idx_paginas_plataforma ON paginas(plataforma);
CREATE INDEX idx_funis_produto ON funis(produto_id);
CREATE INDEX idx_funis_status ON funis(status);
CREATE INDEX idx_produtos_especialista ON produtos(especialista_id);
CREATE INDEX idx_testes_funil ON testes_ab(funil_id);
CREATE INDEX idx_migracoes_pagina ON migracoes(pagina_id);
CREATE INDEX idx_migracoes_status ON migracoes(status);
CREATE INDEX idx_historico_entidade ON historico_alteracoes(entidade, entidade_id);

-- Trigger: sincronizar auth.users → usuarios
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE funis ENABLE ROW LEVEL SECURITY;
ALTER TABLE paginas ENABLE ROW LEVEL SECURITY;
ALTER TABLE migracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklists_publicacao ENABLE ROW LEVEL SECURITY;
ALTER TABLE testes_ab ENABLE ROW LEVEL SECURITY;
ALTER TABLE variantes_teste ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_alteracoes ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
CREATE POLICY "autenticados_select" ON especialistas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON produtos FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON funis FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON paginas FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON migracoes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON checklists_publicacao FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON testes_ab FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON variantes_teste FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "autenticados_select" ON historico_alteracoes FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY "usuarios_select" ON usuarios FOR SELECT TO authenticated USING (TRUE);

-- Escrita: somente editores
CREATE POLICY "editores_write" ON especialistas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON produtos FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON funis FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON paginas FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON migracoes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON checklists_publicacao FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON testes_ab FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
CREATE POLICY "editores_write" ON variantes_teste FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND perfil = 'editor'));
