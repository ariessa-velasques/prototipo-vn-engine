import type { JSX } from 'react'
import type { CharacterDefinition, ImageAsset, Scene } from '../types'
import { findCharacter, resolveStageCharacters } from '../characters'
import { SceneStage } from './SceneStage'

interface ScenePreviewProps {
  scene: Scene
  background: ImageAsset | null
  /** Elenco disponível no projeto (para resolver identidade → sprite). */
  definitions: CharacterDefinition[]
  /** Índice da entrada exibida no palco (selecionada na lista abaixo). */
  entryIndex: number
}

/**
 * R1: preview da cena dentro do editor. Envolve o palco compartilhado
 * (SceneStage) numa moldura 16:9 e mostra a entrada de diálogo
 * selecionada — fala comum na caixa de diálogo (com a expressão daquele
 * momento), ou a pergunta da escolha com as opções como botões, a mesma
 * aparência do modo de jogo.
 */
export function ScenePreview({
  scene,
  background,
  definitions,
  entryIndex
}: ScenePreviewProps): JSX.Element {
  if (background === null) {
    return (
      <div className="scene-preview" aria-label="Preview da cena">
        <div className="scene-preview-empty">
          <p>Escolha um fundo no painel ao lado para começar a montar a cena.</p>
        </div>
      </div>
    )
  }

  const entry = scene.dialogue[entryIndex] ?? null
  const speaker =
    entry?.type === 'line' ? findCharacter(definitions, entry.speakerId) : null

  return (
    <div className="scene-preview" aria-label="Preview da cena">
      <SceneStage
        background={background}
        characters={resolveStageCharacters(scene, entryIndex, definitions)}
        speakerName={speaker?.name ?? ''}
        dialogueText={entry?.text ?? ''}
      >
        {entry?.type === 'choice' && (
          <div className="player-choices">
            {entry.options.map((option) => (
              <span key={option.id} className="player-choice-button player-choice-button--preview">
                {option.text}
              </span>
            ))}
          </div>
        )}
      </SceneStage>
    </div>
  )
}
