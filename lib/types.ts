export type PerfilUsuario = 'editor' | 'visualizador'

export interface Usuario {
  id: string
  nome: string
  email: string
  perfil: PerfilUsuario
  criado_em: string
  atualizado_em: string
}

export interface Configuracao {
  id: string
  categoria: string
  valor: string
  cor?: string | null
  ordem: number
  ativo: boolean
  criado_em: string
}

export interface Especialista {
  id: string
  nome: string
  ativo: boolean
  criado_em: string
  atualizado_em: string
}

export interface Produto {
  id: string
  especialista_id: string
  nome: string
  descricao?: string | null
  ativo: boolean
  criado_em: string
  atualizado_em: string
  especialistas?: Pick<Especialista, 'id' | 'nome'>
}

export interface Funil {
  id: string
  produto_id: string | null
  id_funil?: string | null
  nome: string
  tipo: string
  objetivo?: string | null
  responsavel_cro?: string | null
  responsavel_dev?: string | null
  status: string
  data_ativacao?: string | null
  planilha_leads?: string | null
  planilha_pesquisa?: string | null
  criado_em: string
  atualizado_em: string
  produtos?: Produto & { especialistas?: Pick<Especialista, 'id' | 'nome'> }
  // computed
  total_paginas?: number
  paginas_publicadas?: number
  impl_nao_publicadas?: number
}

export interface Pagina {
  id: string
  funil_id: string
  codigo?: string | null
  nome: string
  etapa?: string | null
  url_pagina?: string | null
  referencia_dev?: string | null
  ferramenta?: string | null
  status: string
  prioridade?: string | null
  responsavel?: string | null
  horas_estimadas?: number | null
  horas_reais?: number | null
  data_prevista?: string | null
  data_publicacao?: string | null
  url_planilha_pesquisa?: string | null
  url_documentacao?: string | null
  observacoes?: string | null
  gtmetrix_grade?: string | null
  gtmetrix_score?: number | null
  gtmetrix_lcp?: number | null
  gtmetrix_tempo?: number | null
  gtmetrix_analisado_em?: string | null
  slug_raiz?: string | null
  variante?: string | null
  versao?: number | null
  pagina_origem_id?: string | null
  criado_em: string
  atualizado_em: string
  funis?: Pick<Funil, 'id' | 'id_funil' | 'nome' | 'tipo'>
}

export interface HistoricoStatusPagina {
  id: string
  pagina_id: string
  status_anterior?: string | null
  status_novo: string
  usuario_id?: string | null
  criado_em: string
  usuarios?: Pick<Usuario, 'nome' | 'email'>
}

export interface ChecklistPublicacao {
  id: string
  pagina_id: string
  vsl_ativo: boolean
  observacao_geral?: string | null
  criado_em: string
  atualizado_em: string
  checklist_itens?: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  checklist_id: string
  fase: 'setup' | 'desenvolvimento' | 'testes' | 'performance'
  item: string
  concluido: boolean
  ordem: number
}


export interface HistoricoAlteracao {
  id: string
  entidade: string
  entidade_id: string
  usuario_id?: string | null
  acao: string
  detalhes?: Record<string, unknown> | null
  criado_em: string
  usuarios?: Pick<Usuario, 'nome' | 'email'>
}

export interface DashboardKpis {
  total_paginas: number
  paginas_publicadas: number
  paginas_em_andamento: number
  paginas_atrasadas: number
  total_funis: number
  funis_ativos: number
  testes_ativos: number
  pct_publicadas: number
}

// Categorias das listas editáveis
export type CategoriaConfig =
  | 'tipo_funil'
  | 'status_funil'
  | 'etapa'
  | 'ferramenta'
  | 'status_pagina'
  | 'prioridade'
  | 'responsavel'
  | 'checklist_setup'
  | 'checklist_desenvolvimento'
  | 'checklist_testes'
  | 'checklist_performance'
