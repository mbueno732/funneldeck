import { Sparkles } from 'lucide-react'
import { EmConstrucao } from '@/components/shared/EmConstrucao'

export default function PadroesSucessoPage() {
  return (
    <EmConstrucao
      titulo="Padrões de Sucesso"
      subtitulo="Inteligência agregada dos experimentos já rodados."
      icon={Sparkles}
      itens={[
        'Quais elementos testados (headline, CTA, oferta...) mais aparecem em testes vencedores',
        'Quais ângulos da Hero tendem a vencer, por segmento e por funil',
        'Cruzamento por layout, seção da página e campanha',
        'Recomendações práticas na hora de montar a próxima hipótese de teste',
      ]}
    />
  )
}
