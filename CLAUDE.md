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
- Construa módulo por módulo — valide que funciona antes de avançar
- Quando algo quebrar, diagnostique antes de reescrever tudo
- Nunca delete arquivos sem confirmar
- **Dê sua opinião ativamente.** Se uma mudança pedida não fizer sentido, se houver um caminho
  mais simples, ou se algo estiver criando débito técnico, fale isso antes de simplesmente
  implementar. Não é preciso esperar ser perguntado.
- **Para o redesign v2** (ver seção abaixo): pode agir com mais autonomia — navegar a pasta
  `stitch-exports/`, decidir o que faz sentido construir e ir implementando aos poucos, sem
  precisar de aprovação prévia de plano pra cada tela. Continua valendo pedir confirmação antes
  de rodar migrations em produção ou fazer push pra Vercel.

---

## Inteligência A/B — desenho no Stitch (processo em andamento)

Marcelo desenha as telas do módulo de Testes A/B no **Google Stitch** (uma de cada vez) e mostra
o HTML exportado (colado no chat ou salvo em `stitch-exports/`, fora do git) para eu revisar antes
de construir. **Não existe mais rota paralela `/v2/...`** — essa separação (`app/v2/...` +
`SidebarV2`/`TopbarV2`) foi um erro de uma sessão anterior (virou um "Frankenstein" de dois
sistemas) e já foi totalmente consolidada de volta em `app/(dashboard)/...` / `components/`.
**Toda tela nova, inclusive as do redesign, entra direto nas rotas/componentes reais — nunca
cria uma árvore paralela.**

### Regra de identidade visual — **sempre a mesma em toda tela nova**

O Stitch exporta com paleta, fontes e ícones próprios (varia a cada tela). **Ignorar a
paleta/tema do Stitch sempre** e aplicar a identidade real do Funneldeck: indigo `#6366f1`,
`bg-gray-950`/`bg-gray-900`, Geist (já instalado), ícones `lucide-react` (mapear os Material
Symbols do mock). Reaproveitar classes/padrões já usados em `ModalFunil.tsx` / `ModalVariante.tsx`
/ `ListaFunis.tsx` pra inputs, selects, botões e cards.

### Reaproveitar > recriar

Antes de construir algo do zero, checar se já existe: se a tela do Stitch é um reskin de algo que
já existe, importar o componente real em vez de recriar a lógica. Sempre reaproveitar
tabelas/colunas e convenções que já existem no banco antes de propor migration nova — nunca
prometer coluna/métrica que não existe de fato (lição de um episódio real desta sessão, em que eu
assumi campos como AOV/CPA/Order Bump que não tinham base no schema).

### Processo de revisão de cada tela nova

Diferente do resto do projeto, aqui eu não apresento plano formal por tela: reviso o export do
Stitch, comparo campo a campo contra o modelo de dados combinado (ver plano ativo em
`~/.claude/plans/`), levanto ambiguidades concretas com o Marcelo, e só então implemento.

### Estado atual

- **Dashboard** (`/dashboard`) — consolidado, com toggle "Operação / Inteligência A/B".
- **Experimentos** (menu lateral; rotas ainda em `/variantes`, `/variantes/novo`,
  `/variantes/[id]`, `/variantes/[id]/editar` — só o rótulo do menu e os títulos de tela viraram
  "Experimentos", as URLs não mudaram) — ligado às tabelas `testes_ab`/`variantes_teste`
  (migrations `001`/`004`/`013` a `021`). Upload de screenshot funcional (bucket Storage
  `teste-ab-screenshots`, aceita imagem ou HTML salvo com SingleFile). Indicador de teste ativo
  visível em Funis, Páginas e no detalhe do Funil (aba "Testes A/B") — calculado a partir de
  `variantes_teste.pagina_id` (todas as páginas com variante ativa acendem, não só uma). Marcador
  manual "Página atual" no Mapa de Páginas indica qual página está genuinamente no ar.
- **Tela de Cadastro/Edição do Teste** (`/variantes/novo` e `/variantes/[id]/editar`, ambas
  reaproveitando `NovoTesteABForm.tsx` via prop `testeParaEditar`) — **pronta**:
  - Página única com scroll, coluna central (`max-w-4xl`), checklist de progresso na **direita**
    (barra de "Progresso Geral" + status por seção: Pendente/Em andamento/Completo). Só os campos
    obrigatórios (nome, funil, hipótese, resultado esperado, elemento testado, páginas das
    variantes, métrica primária) contam pra "Completo" — o resto é complementar.
  - `tipo_teste` (Aquisição/Vendas) deriva automaticamente do `objetivo` do Funil escolhido;
    `especialista_id` deriva automaticamente do Funil (direto ou via `produtos.especialista_id`)
    — ambos somente-leitura, não são mais selecionáveis na tela.
  - Funil de Atuação agrupado por Especialista no dropdown (`SelectGroup`/`SelectLabel`).
  - **Nome do Experimento é texto livre, sem auto-preenchimento** — já teve um auto-fill
    (`Elemento · Funil`) que foi removido por ficar redundante com as colunas dedicadas da Lista;
    hoje só tem placeholder de exemplo + texto de ajuda orientando a descrever a mudança testada,
    não o contexto (que já vive em colunas/campos próprios).
  - Campanha (com opção de criar nova inline), Segmento, Responsável, Data de Início, Elemento
    Testado (`O que vamos testar?`) e Assistente de Hipótese (até 3 ângulos) — em Informações
    Básicas / Framework de Hipótese.
  - **Toda variante precisa estar vinculada a uma página cadastrada no Mapa de Páginas**
    (`variantes_teste.pagina_id`, obrigatório, validado em `criarTesteAB`/`atualizarTesteAB`).
    Autofill da URL a partir da página escolhida, mas a URL continua editável (ex: pra UTM).
  - Alerta (**não bloqueante**) se a página escolhida numa variante já está vinculada a outro
    teste com status `Ativo` — cruza com uma query de `variantes_teste` filtrada por
    `testes_ab.status = 'Ativo'`, passada como prop `paginasEmTesteAtivo`.
  - **Percentual de tráfego é editável por variante** (input numérico) — antes só existia o botão
    "Distribuir tráfego igualmente" sem nenhum jeito de deixar desigual, o que fazia o botão
    parecer quebrado (nunca havia nada pra redistribuir). Indicador "Total: X%" ao lado do botão
    fica âmbar se a soma não bater 100%.
  - **Layout (Curto/Longo) é por variante**, não do teste inteiro.
  - **URL de Ativação do Teste** — campo editável na seção Revisão. Calculada automaticamente a
    partir da URL de qualquer variante (remove o último segmento do path — a letra/versão, ex:
    `/a`, `/a-v2`), com fallback automático enquanto o campo não for editado manualmente
    (`testes_ab.url_ativacao`, migration `021`). É a mesma URL usada no botão de acesso rápido da
    Lista de Experimentos — edite aqui se o cálculo automático sair errado.
  - Primeira variante é sempre o Controle (fixo, não removível) — rotulada "Controle (A)" na UI.
  - `codigo` do teste auto-gerado (`{sequencial}_{Segmento}_{Campanha}`), sequencial escopado por
    Funil + Segmento. Não muda ao editar um teste existente.
  - Lightbox/zoom nos screenshots; upload aceita colar (Ctrl+V) direto na área de upload.
- **Tela de Detalhe do Experimento** (`/variantes/[id]`, `DetalheTesteAB.tsx`) — **pronta**:
  - Header com Segmento, Campanha, Elemento Testado e Ângulos visíveis (badges), Especialista e
    Responsável.
  - Confiança estatística real por variante vs. Controle (`lib/estatistica.ts` — z-test de duas
    proporções, classificação Alta/Média/Baixa), com aviso (não bloqueante) de amostra pequena
    (`< MIN_CONVERSOES_CONFIAVEL`) ou teste rodando há pouco tempo (`< MIN_DIAS_RECOMENDADO`).
  - Cada variante exibe Layout, Headline, Subheadline e URL de Preview (antes só apareciam
    reabrindo o formulário de Edição).
  - "Marcar vencedora" (por variante) / "Desfazer" (reverte pra Ativo) / "Aplicar Vencedor"
    (muda status pra `Vencedor implementado`).
  - **"Encerrar sem vencedor"** — fecha o teste em empate/inconclusivo sem declarar vencedora
    (`testes_ab.resultado_final = 'sem_vencedor'`, migration `020`), com opção de "Reabrir". Antes
    disso, um teste sem resultado claro só podia ficar "Ativo" pra sempre ou forçar uma vencedora
    artificial.
  - Screenshot com lightbox/zoom; referência HTML (SingleFile) abre em nova aba já com o
    `Content-Type` corrigido (Supabase Storage serve HTML como `text/plain` por padrão em bucket
    público — contorna buscando o texto e reembrulhando num Blob `text/html`).
- **Tela de Lista de Experimentos** (`ListaVariantes.tsx`, `/variantes`) — **pronta**:
  - Toggle Todos/Aquisição/Vendas; filtros por Funil, Especialista, Responsável, Segmento,
    Campanha, Elemento Testado, Ângulo, Layout, Status, Período; busca por nome/código.
  - Colunas dedicadas (não mais texto empilhado): Experimento (nome + `#sequencial`), Funil,
    Campanha, Elemento, Ângulos da Hero, Layout, Segmentação, Status, Resultado, Métrica/RPV,
    Ações. Todas viraram filtro também — pensadas pra alimentar a futura tela de Inteligência.
  - Cabeçalhos **Experimento / Status / Resultado são clicáveis pra ordenar** (nome, prioridade de
    status, ou lift da vencedora/líder) — sem isso só dava pra filtrar, não rankear.
  - **Exportar CSV** (botão no topo) — baixa os experimentos filtrados na tela, com BOM UTF-8
    (acentuação correta no Excel).
  - Agrupamento por funil só ativa quando há **mais de 15** experimentos filtrados
    (`LIMIAR_AGRUPAMENTO`) — com poucos testes o agrupamento só atrapalhava (2 níveis de expand
    pra ver o que já cabia direto na tela). Paginação client-side, 30 por página.
  - **Expand rápido por linha** (seta à esquerda) mostra, por variante: screenshot/referência
    HTML, headline, subheadline, layout, link de preview — e, na edição de métricas, o **CVR
    calculado ao vivo** (CVR Geral sempre; em testes de Vendas também Sessão → Checkout e
    Checkout → Venda) conforme os números são digitados.
  - Botão de acesso rápido à **URL de Ativação do teste** (ícone `ExternalLink`, mesmo padrão do
    Mapa de Páginas) — abre em nova aba, não copia.
  - Ações por linha: acessar URL de ativação, editar, duplicar (`duplicarTesteAB` — clona teste +
    variantes com status `Planejado`, sem as métricas), excluir (com confirmação inline).

### Pendências conhecidas (levantadas comparando com a planilha antiga do Marcelo)

- **Aprendizado Aplicável (escopo Universal/outro)** — existe na planilha, não em Funneldeck
  ainda (era a ideia do antigo `aprendizado_escopo` da Fase 4 do plano, nunca implementada). Hoje
  só existe o campo "Aprendizado" livre (`testes_ab.resultado`), sem o escopo.
- **Lista de Ângulos incompleta** — a planilha usa Tempo, Dor/Problema, Acesso/Exclusividade,
  que não estão na categoria `angulo_hero` seedada hoje. Reconciliar antes de confiar na análise
  de "Padrões de Sucesso" futura.

Resolvidas nesta sessão: confiança estatística real (z-test), resultado com estado "sem vencedor"
(empate/inconclusivo, `resultado_final`), URL de ativação do teste (calculada + editável).

### Roadmap discutido em 2026-07-21 (prioridade ainda não definida)

Marcelo quer construir a seguir, nesta ordem a confirmar:
- **Backlog de Testes** — ainda em aberto se é uma tela nova leve (só hipótese + prioridade, sem
  exigir página/variante cadastrada, "promovendo" pra Experimento formal quando for construir de
  verdade) ou um filtro dos testes já com status `Planejado` na Lista atual.
- **Inteligência / Padrões de Sucesso** — tela que agrega os experimentos já rodados pra mostrar
  quais ângulos/elementos/layouts tendem a vencer. Já estava no radar desde o início do módulo
  (Fase 6 do plano em `~/.claude/plans/`); só faz sentido com volume real de testes com ângulo
  preenchido, que já está acontecendo desde que `angulos` virou campo obrigatório-de-fato no
  Cadastro.
- **Dashboard de Testes** — KPIs focados só no módulo de Experimentos, separado do Dashboard
  operacional que já existe (que cobre Funis/Páginas/Especialistas, não testes A/B).

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
- **Experimentos (Inteligência A/B)** — Cadastro, Edição, Detalhe e Lista prontos (ver seção
  "Inteligência A/B" acima). Backlog de Testes, Inteligência/Padrões de Sucesso e Dashboard de
  Testes ainda não construídos (ver "Roadmap discutido em 2026-07-21").

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

### Convenção de migrations

Não há Supabase CLI linkado neste projeto — toda migration em `supabase/migrations/*.sql` é
escrita aqui mas **rodada manualmente por Marcelo no SQL Editor do Supabase**. Eu nunca rodo
migration em produção sozinho: crio o arquivo, aviso exatamente o que fazer, e só sigo com o
código que depende dela depois de confirmação de que rodou.

Migrations do módulo de Testes A/B, em ordem (016 a 019 fazem parte da reconstrução da tela de
Cadastro do Teste nesta sessão):
- `016_campanhas_teste.sql` — tabela `campanhas` (sem `funil_id` fixo — uma campanha pode
  abranger mais de um funil), colunas `campanha_id`/`segmento`/`especialista_id`/`layout`/`codigo`
  em `testes_ab`, `headline`/`subheadline`/`url_preview` em `variantes_teste`.
- `017_variante_pagina_id.sql` — `variantes_teste.pagina_id` (vínculo obrigatório por variante,
  substitui o antigo `testes_ab.pagina_id` único). Indicador "teste ativo" do Mapa de Páginas
  passou a ler daqui.
- `018_elemento_testado_angulos.sql` — `testes_ab.angulos` TEXT[] (lista única até 3, substitui
  `angulo_primario`/`angulos_secundarios`), seeds de `configuracoes` categoria `elemento_testado`.
- `019_layout_por_variante.sql` — `variantes_teste.layout` (Curto/Longo por variante, substitui
  `testes_ab.layout` do teste inteiro).
- `020_resultado_final_teste.sql` — `testes_ab.resultado_final` (`'vencedora'` | `'sem_vencedor'`)
  — permite encerrar um teste em empate/inconclusivo sem forçar uma vencedora artificial.
- `021_url_ativacao_teste.sql` — `testes_ab.url_ativacao` — versão editável da URL de ativação do
  teste, com fallback automático calculado a partir da URL das variantes.

**Colunas antigas não são dropadas** (`testes_ab.pagina_id`, `testes_ab.layout`,
`testes_ab.angulo_primario`, `testes_ab.angulos_secundarios`) — ficam no banco por compatibilidade
com testes já criados antes dessas mudanças, mas não são mais preenchidas por telas novas.

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
  009_estrategias_sem_rls.sql     # DISABLE RLS + remove políticas da tabela estrategias
  013_testes_ab_wizard.sql        # colunas de teste A/B + bucket Storage
  016_campanhas_teste.sql         # tabela campanhas + campos de cadastro do teste
  017_variante_pagina_id.sql      # variantes_teste.pagina_id (vínculo obrigatório por variante)
  018_elemento_testado_angulos.sql # testes_ab.angulos (lista única até 3) + config elemento_testado
  019_layout_por_variante.sql     # variantes_teste.layout (Curto/Longo por variante)
  020_resultado_final_teste.sql   # testes_ab.resultado_final ('vencedora' | 'sem_vencedor')
  021_url_ativacao_teste.sql      # testes_ab.url_ativacao (editável, fallback automático)

app/(dashboard)/
  dashboard/page.tsx              # reaproveita DashboardView real; toggle Operação/Inteligência A/B
  variantes/page.tsx              # lista de experimentos (ListaVariantes) — rota mantida por compat.
  variantes/novo/page.tsx         # cadastro de experimento (NovoTesteABForm) — tela pronta
  variantes/[id]/page.tsx         # detalhe do experimento (DetalheTesteAB) — tela pronta
  variantes/[id]/editar/page.tsx  # edição de experimento (reaproveita NovoTesteABForm)

components/testes-ab/             # nome de pasta renomeado de components/v2/ (era confuso, dava
                                   # a entender que existia uma "v1" sendo substituída — não existe)
  DashboardV2View.tsx
  variantes/NovoTesteABForm.tsx   # tela de Cadastro/Edição — ver "Estado atual" acima
  variantes/DetalheTesteAB.tsx    # tela de Detalhe — ver "Estado atual" acima
  variantes/ListaVariantes.tsx    # tela de Lista — ver "Estado atual" acima

lib/actions/testes-ab.ts          # criarTesteAB, atualizarTesteAB, duplicarTesteAB,
                                   # uploadScreenshotVariante, listarTestesAB, buscarTesteAB,
                                   # atualizarMetricasVariante, atualizarHipotese, atualizarAprendizado,
                                   # declararVencedora, desfazerVencedora, encerrarSemVencedor,
                                   # aplicarVencedor, deletarTesteAB — todas seguem { ok, erro } (não throw)
lib/actions/campanhas.ts          # listarCampanhas, criarCampanha
lib/estatistica.ts                # confiancaZTest, classificarConfianca (z-test de duas proporções),
                                   # MIN_CONVERSOES_CONFIAVEL, MIN_DIAS_RECOMENDADO

components/layout/Sidebar.tsx     # item de menu "Experimentos" (ícone FlaskConical) aponta pra /variantes

stitch-exports/                   # exports HTML do Stitch (fora do git) — ver seção Inteligência A/B
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
