/**
 * Convenção de nomenclatura de sprites e agrupamento por personagem.
 *
 * R1: o escritor não cadastra personagens em formulário nenhum — ele
 * simplesmente importa as imagens nomeadas como `nome_expressao.png`
 * (ex.: `maria_triste.png` = personagem "maria", expressão "triste") e a
 * ferramenta agrupa sozinha os arquivos que compartilham a identidade.
 * Sem "_" no nome, o arquivo inteiro é a identidade e a expressão é
 * "padrão".
 */
import type {
  CharacterDefinition,
  CharacterPosition,
  ImageAsset,
  Scene
} from './types'

export const DEFAULT_EXPRESSION = 'padrão'

/** Converte um slug em rótulo legível ("aiko" → "Aiko"). */
function toLabel(slug: string): string {
  const clean = slug.replace(/[-_]+/g, ' ').trim()
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

/**
 * Interpreta o nome do arquivo (sem extensão) na convenção
 * `identidade_expressao`. Só o primeiro "_" separa: `ana_maria_feliz`
 * seria identidade "ana" — por isso a divisão usa o ÚLTIMO "_", que
 * casa melhor com nomes compostos (`ana_maria_feliz` → "ana_maria" +
 * "feliz").
 */
export function parseCharacterFileName(baseName: string): {
  characterId: string
  expression: string
} {
  const separator = baseName.lastIndexOf('_')
  if (separator <= 0 || separator === baseName.length - 1) {
    return { characterId: baseName.toLowerCase(), expression: DEFAULT_EXPRESSION }
  }
  return {
    characterId: baseName.slice(0, separator).toLowerCase(),
    expression: baseName.slice(separator + 1).toLowerCase()
  }
}

/**
 * Agrupa os arquivos de sprite por identidade, formando o elenco
 * disponível no projeto. A ordem de chegada define a expressão padrão
 * (a primeira do personagem).
 */
export function buildCharacterDefinitions(assets: ImageAsset[]): CharacterDefinition[] {
  const byCharacter = new Map<string, CharacterDefinition>()
  for (const asset of assets) {
    const { characterId, expression } = parseCharacterFileName(asset.label)
    let definition = byCharacter.get(characterId)
    if (!definition) {
      definition = { id: characterId, name: toLabel(characterId), expressions: [] }
      byCharacter.set(characterId, definition)
    }
    if (definition.expressions.some((e) => e.name === expression)) continue
    definition.expressions.push({ name: expression, label: toLabel(expression), url: asset.url })
  }
  return [...byCharacter.values()]
}

export function findCharacter(
  definitions: CharacterDefinition[],
  characterId: string | null
): CharacterDefinition | null {
  if (!characterId) return null
  return definitions.find((c) => c.id === characterId) ?? null
}

/** URL do sprite de um personagem numa expressão (cai na padrão se faltar). */
export function expressionUrl(
  definition: CharacterDefinition,
  expression: string | undefined
): string {
  const found = definition.expressions.find((e) => e.name === expression)
  return (found ?? definition.expressions[0])?.url ?? ''
}

/** Um personagem resolvido para renderização no palco. */
export interface StageCharacter {
  position: CharacterPosition
  characterId: string
  url: string
  /** true quando é quem fala na entrada atual (destaque visual). */
  speaking: boolean
}

const POSITIONS: CharacterPosition[] = ['esquerda', 'centro', 'direita']

/**
 * R1: resolve o palco para uma entrada da sequência.
 *
 * O elenco (quem está em cena e onde) é fixo durante toda a cena — o que
 * varia por fala é apenas QUAL EXPRESSÃO cada personagem mostra
 * (ADR-0016). A expressão de um personagem é a última que ele usou até
 * esta entrada; antes de falar pela primeira vez, mostra a padrão.
 */
export function resolveStageCharacters(
  scene: Scene,
  entryIndex: number,
  definitions: CharacterDefinition[]
): StageCharacter[] {
  // Última expressão usada por cada personagem até a entrada atual.
  const currentExpression = new Map<string, string>()
  for (let i = 0; i <= entryIndex && i < scene.dialogue.length; i++) {
    const entry = scene.dialogue[i]
    if (entry.type !== 'line' || !entry.speakerId) continue
    currentExpression.set(entry.speakerId, entry.expression)
  }

  const activeEntry = scene.dialogue[entryIndex]
  const speakingId =
    activeEntry?.type === 'line' ? activeEntry.speakerId : ''

  const result: StageCharacter[] = []
  for (const position of POSITIONS) {
    const characterId = scene.characters[position]
    if (!characterId) continue
    const definition = findCharacter(definitions, characterId)
    if (!definition) continue
    result.push({
      position,
      characterId,
      url: expressionUrl(definition, currentExpression.get(characterId)),
      speaking: characterId === speakingId
    })
  }
  return result
}
