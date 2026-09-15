/**
 * Modelo de dados da história (cenas, sequências de diálogo e ramificações).
 *
 * Este é o único "formato" que o escritor manipula — e ele nunca o vê como
 * texto: toda edição acontece pela interface gráfica (R1 e R4). Não existe
 * linguagem de script nem campo de código no protótipo.
 *
 * Modelo vigente (ADR-0012 e ADR-0016): uma cena é um "palco" fixo
 * (fundo + elenco posicionado) sobre o qual corre uma SEQUÊNCIA ordenada de falas
 * (`dialogue`). A ramificação é um tipo de entrada dessa sequência
 * (escolha com opções), e a continuação linear entre cenas é o
 * `nextSceneId`. Substitui o modelo antigo de 1 fala por cena + array de
 * escolhas separado (ADR-0008, superado).
 */

/** Posição horizontal do sprite no palco, escolhida por botões na interface. */
export type CharacterPosition = 'esquerda' | 'centro' | 'direita'

/** Uma imagem selecionável (background ou sprite), embutida ou importada. */
export interface ImageAsset {
  id: string
  /** Nome exibido na galeria, legível para o escritor. */
  label: string
  /** URL local da imagem (asset embutido ou blob importado do computador). */
  url: string
  /** true quando a imagem foi importada do computador do escritor. */
  imported?: boolean
}

/**
 * R4: uma opção dentro de uma escolha — o botão que o jogador clica e a
 * aresta do grafo até a cena de destino.
 */
export interface ChoiceOption {
  id: string
  /** Texto do botão, digitado pelo escritor (R2). */
  text: string
  /** id da Scene de destino; vazio ('') enquanto o escritor não escolher. */
  targetSceneId: string
}

/**
 * Um personagem do projeto: uma identidade com uma ou mais expressões,
 * agrupadas a partir dos nomes dos arquivos de sprite (ADR-0016).
 */
export interface CharacterDefinition {
  /** Identidade (parte antes do "_" no nome do arquivo), ex.: "aiko". */
  id: string
  /** Nome legível exibido na interface e na caixa de diálogo, ex.: "Aiko". */
  name: string
  /** Variantes de sprite; a primeira é a expressão padrão. */
  expressions: CharacterExpression[]
}

export interface CharacterExpression {
  /** Nome da expressão (parte após o "_"), ex.: "triste" ou "padrão". */
  name: string
  /** Rótulo exibido no seletor, ex.: "Triste". */
  label: string
  url: string
}

/**
 * Uma fala comum: quem fala, com que expressão, e o texto. Avançar leva
 * à próxima entrada.
 */
export interface DialogueLine {
  id: string
  type: 'line'
  /**
   * R1: identidade de quem fala — referencia um personagem do elenco
   * DESTA cena (Scene.characters). Vazio significa narração, sem
   * etiqueta de nome na caixa de diálogo.
   */
  speakerId: string
  /** R1: expressão que o personagem falante mostra nesta fala (ADR-0016). */
  expression: string
  /** Texto da fala, digitado pelo escritor (R2). */
  text: string
}

/**
 * R4: uma escolha dentro da sequência de diálogo: a pergunta/gancho e as
 * opções que ramificam a história. Por convenção da UI, é a última
 * entrada da sequência (depois dela o caminho já se decidiu).
 */
export interface DialogueChoice {
  id: string
  type: 'choice'
  /** A pergunta/gancho exibida na caixa de diálogo (ex.: "Onde eu vou hoje?"). */
  text: string
  options: ChoiceOption[]
}

/** Uma entrada da sequência de diálogo de uma cena. */
export type DialogueEntry = DialogueLine | DialogueChoice

/**
 * Os três lugares do palco: cada um pode ter um personagem (ou nenhum).
 * O valor é a IDENTIDADE do personagem (CharacterDefinition.id) — a
 * expressão exibida varia por fala, não por lugar (ADR-0016). O escritor
 * preenche os lugares visualmente no painel de personagens.
 */
export type SceneCharacters = Record<CharacterPosition, string | null>

/**
 * R1: a cena é um palco fixo (fundo + até três personagens posicionados)
 * escolhido visualmente pelo escritor, mais a sequência de falas que
 * corre sobre ele.
 *
 * R4: cada cena é um nó do grafo; as arestas saem da entrada de escolha
 * (uma por opção) ou do `nextSceneId` (continuação linear automática).
 */
export interface Scene {
  id: string
  /** Nome da cena, exibido no nó do grafo (ex.: "Encontro no parque"). */
  title: string
  /** id do ImageAsset de fundo escolhido, ou null (palco vazio). */
  backgroundId: string | null
  /** Personagens no palco, por posição (identidade do personagem ou null). */
  characters: SceneCharacters
  /** Sequência ordenada de falas/escolha percorrida com "avançar". */
  dialogue: DialogueEntry[]
  /**
   * Continuação linear: quando a sequência termina sem escolha, o jogo
   * segue automaticamente para esta cena (null/ausente = fim da história).
   */
  nextSceneId?: string | null
  /** R4: posição do nó desta cena no editor de ramificações. */
  graphPosition: { x: number; y: number }
}

/**
 * A história completa: cenas, ponto de partida e os textos do menu do
 * jogo. É esta estrutura que o modo de jogo percorre e que a exportação
 * embute no executável (R3).
 */
export interface Story {
  title: string
  /** Texto da tela "Sobre" do menu do jogo, escrito pelo escritor (R2). */
  about: string
  startSceneId: string
  scenes: Scene[]
}

/**
 * Formato do arquivo de projeto (.vnproj) salvo/aberto em disco e também
 * do arquivo embutido no jogo exportado (ADR-0014). As imagens importadas
 * pelo escritor viajam junto como data URLs — o projeto é um arquivo
 * único, autocontido e 100% local (R3).
 */
export interface ProjectFile {
  version: 2
  story: Story
  importedBackgrounds: ImageAsset[]
  /**
   * Sprites importados pelo escritor. O `label` guarda o nome original do
   * arquivo (`nome_expressao`), do qual a identidade e a expressão são
   * reinterpretadas ao abrir o projeto (ADR-0016).
   */
  importedCharacters: ImageAsset[]
}

/** Validação mínima de um arquivo de projeto aberto do disco. */
export function isProjectFile(value: unknown): value is ProjectFile {
  if (typeof value !== 'object' || value === null) return false
  const p = value as Record<string, unknown>
  const story = p['story'] as Record<string, unknown> | undefined
  return (
    p['version'] === 2 &&
    typeof story === 'object' &&
    story !== null &&
    Array.isArray(story['scenes']) &&
    typeof story['startSceneId'] === 'string' &&
    Array.isArray(p['importedBackgrounds']) &&
    Array.isArray(p['importedCharacters'])
  )
}

let idCounter = 0
function newId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

let sceneCounter = 0

/** Cria uma cena vazia (com uma primeira fala em branco para editar). */
export function createScene(graphPosition: { x: number; y: number }): Scene {
  sceneCounter += 1
  return {
    id: newId('cena'),
    title: `Cena ${sceneCounter}`,
    backgroundId: null,
    characters: { esquerda: null, centro: null, direita: null },
    dialogue: [createLine()],
    nextSceneId: null,
    graphPosition
  }
}

/** Cria uma fala vazia (narração), a preencher pelo escritor. */
export function createLine(): DialogueLine {
  return { id: newId('fala'), type: 'line', speakerId: '', expression: '', text: '' }
}

/** Cria uma opção de escolha com destino em aberto. */
export function createOption(targetSceneId = ''): ChoiceOption {
  return { id: newId('opcao'), text: 'Nova opção', targetSceneId }
}

/** Converte uma fala no fecho de escolha da cena (o texto vira a pergunta). */
export function lineToChoice(line: DialogueLine): DialogueChoice {
  return {
    id: newId('escolha'),
    type: 'choice',
    text: line.text,
    options: [createOption()]
  }
}
