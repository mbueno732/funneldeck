# Funneldeck — CLAUDE.md

Hub operacional centralizado para gestão de CRO e funis de marketing digital.
Em produção: **https://funneldeck.vercel.app** | Repo: **mbueno732/funneldeck**

---

## Localização e Stack

- **Pasta local:** `~/Claude-Projects/hub-operacional/`
- **Framework:** Next.js 14 (App Router)
- **Banco:** Supabase (PostgreSQL) — projeto `kkeyycyyntcyagpdpvxa`
- **Auth:** desabilitado — acesso público (middleware liberado, server client usa service role key para bypassar RLS)
- **UI:** Tailwind CSS + Shadcn/UI
- **Linguagem:** TypeScript
- **Idioma:** Português (BR)
- **Deploy:** Vercel (auto-deploy no push para main)
- **Cor primária:** indigo (`#6366f1`) — NÃO trocar
- **Tema:** dark — `bg-gray-950` (fundo) / `bg-gray-900` (cards)

### Como rodar localmente

```bash
cd ~/Claude-Projects/hub-operacional
export NVM_DIR="$HOME/.nvm" && . "$NVM_DIR/nvm.sh"
npm run dev
# http://localhost:3000
```

### Push para produção

```bash
GH_TOKEN=$(gh auth token --hostname github.com --user mbueno732) && \
git remote set-url origin https://mbueno732:${GH_TOKEN}@github.com/mbueno732/funneldeck.git && \
git push origin main
```

Sempre rodar `npm run build` antes de fazer push para evitar erros na Vercel.

---

## Comportamento Esperado

- Sempre leia este arquivo antes de qualquer ação
- Nunca use outra stack sem instrução explícita
- Antes de executar qualquer fase, apresente o plano e aguarde aprovação
- Construa módulo por módulo — valide que funciona antes de avançar
- Quando algo quebrar, diagnostique antes de reescrever tudo
- Nunca delete arquivos sem confirmar

---

## Hierarquia do Sistema

```
Especialista → Produto → Funil → Estratégia → Página
```

- **Especialista** — quem executa (ex: Pedro Sobral)
- **Produto** — o que é vendido (ex: PAI, MSTP)
- **Funil** — mecanismo de venda ou captação
  - `objetivo`: `Venda` (produto obrigatório) ou `Aquisição` (produto opcional)
  - `tipo`: Lançamento | Perpétuo | Webinar | Live | Evento | VSL
- **Estratégia** — subdivisão do funil para abordagens diferentes (ex: Captação Normal, Aplicação). Campo `caminho_url` opcional.
- **Página** — cada URL do funil, vinculada ao funil + estratégia opcional
  - **Etapas** são rótulos da página (Captura, VSL, TYP, etc.) — configuráveis em Configurações. Não são um nível hierárquico.

### Ordem de preenchimento

1. Especialista → 2. Produto → 3. Funil → 4. Estratégia (se houver) → 5. Página

---

## Módulos Implementados

- **Dashboard** — pipeline bar, KPIs de fluxo e saúde, alertas condicionais, publicadas no mês, horas, por especialista. Filtro por mês e especialista.
- **Especialistas** — CRUD
- **Produtos** — CRUD vinculado a especialista
- **Funis** — CRUD, duplicar, detalhe com abas (Timeline, Páginas, Estratégias)
- **Estratégias** — CRUD dentro do detalhe do funil. Agrupa páginas por estratégia no Mapa de Páginas. Estado gerenciado localmente com sync silencioso ao abrir a aba.
- **Páginas (Mapa de Páginas)** — tabela + Kanban com drag & drop, edição inline, GTmetrix, checklist de publicação, sistema de variantes, agrupamento por estratégia, filtro por especialista
- **Configurações** — listas dinâmicas editáveis (status, etapas, ferramentas, prioridades, etc.)

---

## Sistema de Variantes de Página

Páginas podem ter variantes com slugs estruturados:

```
dominio.com / caminho-do-funil / slug-raiz - variante - versao
Ex: lp.pedro.com.br/primeiro-anuncio/inscricoes-abertas-a-v2
```

- **slug_raiz** — nome base da página (`inscricoes-abertas`)
- **variante** — letra estrutural (`a`, `b`, `c`) — muda quando layout/estrutura/comprimento/oferta mudam
- **versao** — número de iteração (`v2`, `v3`) — muda quando só elemento de texto muda (headline, CTA, bullets)

Casos especiais:
- Slug só com letra (`/a`, `/b`): slug_raiz vazio, variante = letra
- Páginas legacy sem letra: tratadas como variante A implícita (elemento → `slug-a-v2`, estrutura → `slug-b`)

O botão **"Criar variante"** (ícone GitBranch) no Mapa de Páginas abre modal com checklist que determina automaticamente o tipo de mudança e gera a URL. Colunas em `paginas`: `slug_raiz`, `variante`, `versao`, `pagina_origem_id`.

---

## Lógica de Negócio — Regras Importantes

- **Página atrasada:** prazo vencido + status NÃO é `Publicada`, `Suspensa` ou `Implementada`. `Implementada` = entregue, aguardando publicação — não conta como atrasada.
- **Etapa do funil fica verde** se ao menos UMA página daquela etapa está `Publicada` (não exige todas).
- **Funil de Venda** → `produto_id` obrigatório. **Funil de Aquisição** → `produto_id` opcional.
- **Estratégia** → `caminho_url` opcional. Ao filtrar por funil no Mapa de Páginas, páginas são agrupadas por estratégia.

---

## Banco de Dados — Tabelas Atuais

```
especialistas → produtos → funis → estrategias → paginas
                                               → checklists_publicacao → checklist_itens
                                               → historico_status_pagina
                                 → testes_ab → variantes_teste
historico_alteracoes
configuracoes
usuarios
migracoes
```

### Armadilha conhecida — tabela `estrategias`

A tabela `estrategias` foi criada manualmente no Supabase dashboard (fora do sistema de migrations). Isso causou problemas de RLS silencioso em produção. A migration `009_estrategias_sem_rls.sql` garante:
- `RLS DISABLED` na tabela
- Todas as políticas removidas

Se a tabela for recriada, rodar a migration ou executar manualmente no SQL Editor:
```sql
ALTER TABLE estrategias DISABLE ROW LEVEL SECURITY;
```

### Colunas relevantes adicionadas pós-schema inicial

**`funis`**
- `objetivo` TEXT — `Venda` | `Aquisição`
- `id_funil` TEXT — código curto (ex: PAI, MSTP)
- `data_ativacao` DATE
- `planilha_leads` TEXT
- `planilha_pesquisa` TEXT

**`paginas`**
- `codigo` TEXT — gerado automaticamente (ex: CP-01)
- `etapa` TEXT — Captura | VSL | TYP | OTO | Auxiliares
- `ferramenta` TEXT
- `horas_estimadas` FLOAT
- `horas_reais` FLOAT
- `data_prevista` DATE
- `data_publicacao` DATE
- `referencia_dev` TEXT
- `gtmetrix_grade`, `gtmetrix_score`, `gtmetrix_lcp`, `gtmetrix_tempo`, `gtmetrix_analisado_em`
- `slug_raiz` TEXT
- `variante` TEXT
- `versao` INTEGER
- `pagina_origem_id` UUID REFERENCES paginas(id)
- `estrategia_id` UUID REFERENCES estrategias(id)

**`estrategias`**
```sql
CREATE TABLE estrategias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funil_id UUID NOT NULL REFERENCES funis(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  caminho_url TEXT,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);
-- RLS DEVE estar DISABLED (ver armadilha acima)
CREATE INDEX IF NOT EXISTS idx_estrategias_funil ON estrategias(funil_id);
CREATE INDEX IF NOT EXISTS idx_paginas_estrategia ON paginas(estrategia_id);
```

---

## Estrutura de Arquivos Relevantes

```
app/(dashboard)/
  dashboard/page.tsx         # KPIs computados server-side
  funis/page.tsx             # Lista funis com métricas de etapas
  funis/[id]/page.tsx        # Detalhe do funil (busca estrategias)
  paginas/page.tsx           # Mapa de páginas (funis com produtos.especialista_id)

components/
  dashboard/DashboardView.tsx
  funis/ListaFunis.tsx
  funis/DetalhesFunil.tsx    # Abas: Timeline, Páginas, Estratégias
                             # — estrategiasState + estrategiaOverrides gerenciados localmente
                             # — sync silencioso com banco ao abrir aba Estratégias
  funis/ModalFunil.tsx
  funis/ModalEstrategia.tsx  # CRUD de estratégias (onSalvo retorna Estrategia criada/editada)
  paginas/MapaPaginas.tsx    # Tabela + Kanban; filtros: especialista, funil, tipo, etapa, status...
  paginas/ModalPagina.tsx    # Inclui seletor de estratégia
  paginas/ModalVariante.tsx  # Sistema de slugs e variantes
  paginas/PainelChecklist.tsx

lib/
  actions/paginas.ts         # Inclui criarVariante()
  actions/estrategias.ts     # CRUD + listarAtribuicoesPaginas()
  actions/funis.ts
  actions/dashboard.ts
  types.ts                   # Interfaces: Pagina, Funil, Estrategia, etc.
  supabase/server.ts         # createClient() com service role key (bypassa RLS)

supabase/migrations/
  009_estrategias_sem_rls.sql  # DISABLE RLS + remove políticas da tabela estrategias
```

---

## Convenções de Código

- Server actions ficam em `lib/actions/` com `'use server'` no topo
- Sempre chamar `revalidatePath()` após mutations
- Auth bypassed via service role key — não adicionar verificações de auth nas actions
- Componentes de página são server components; interatividade em client components separados
- Shadcn/UI como base — não criar componentes de UI do zero
- Server actions NÃO devem usar `throw` para erros de negócio — retornar `{ ok: boolean; erro?: string }` para evitar "Server Components render error" no Next.js 14

---

## Variáveis de Ambiente

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GTMETRIX_API_KEY=
```
