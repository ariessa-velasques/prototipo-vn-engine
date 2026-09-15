/**
 * Catálogo dos assets placeholder embutidos no protótipo.
 *
 * As imagens são SVGs locais, resolvidos pelo Vite em tempo de build —
 * nenhuma é carregada da internet (R3). O escritor também pode importar
 * imagens do próprio computador pelos painéis de seleção (R1), que são
 * adicionadas em tempo de execução à lista exibida.
 *
 * Os sprites embutidos seguem a MESMA convenção de nomes dos arquivos
 * importados (`identidade_expressao`, ADR-0016): o agrupamento por
 * personagem é feito pelo mesmo código nos dois casos, sem exceção para
 * os assets internos.
 */
import type { ImageAsset } from './types'

import bgQuarto from './assets/backgrounds/quarto.svg'
import bgSalaDeAula from './assets/backgrounds/sala-de-aula.svg'
import bgParque from './assets/backgrounds/parque.svg'

import aikoNeutra from './assets/characters/aiko_neutra.svg'
import aikoFeliz from './assets/characters/aiko_feliz.svg'
import aikoTriste from './assets/characters/aiko_triste.svg'
import brunoNeutro from './assets/characters/bruno_neutro.svg'
import sakuraNeutra from './assets/characters/sakura_neutra.svg'

export const BUILTIN_BACKGROUNDS: ImageAsset[] = [
  { id: 'bg-quarto', label: 'Quarto', url: bgQuarto },
  { id: 'bg-sala-de-aula', label: 'Sala de aula', url: bgSalaDeAula },
  { id: 'bg-parque', label: 'Parque', url: bgParque }
]

/** `label` = nome do arquivo sem extensão: é ele que carrega a convenção. */
export const BUILTIN_CHARACTERS: ImageAsset[] = [
  { id: 'ch-aiko-neutra', label: 'aiko_neutra', url: aikoNeutra },
  { id: 'ch-aiko-feliz', label: 'aiko_feliz', url: aikoFeliz },
  { id: 'ch-aiko-triste', label: 'aiko_triste', url: aikoTriste },
  { id: 'ch-bruno-neutro', label: 'bruno_neutro', url: brunoNeutro },
  { id: 'ch-sakura-neutra', label: 'sakura_neutra', url: sakuraNeutra }
]
