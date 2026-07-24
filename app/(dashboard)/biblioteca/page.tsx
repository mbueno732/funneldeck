import { Library } from 'lucide-react'
import { EmConstrucao } from '@/components/shared/EmConstrucao'

export default function BibliotecaPage() {
  return (
    <EmConstrucao
      titulo="Biblioteca"
      subtitulo="Repositório de referências pra criar novos experimentos."
      icon={Library}
      itens={[
        'Headlines, ângulos e criativos que já venceram testes',
        'Consulta rápida na hora de criar um novo experimento',
        'Filtros por elemento, ângulo e segmento',
        'Escopo exato ainda em definição',
      ]}
    />
  )
}
