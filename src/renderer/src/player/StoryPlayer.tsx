import { useState, type JSX } from 'react'
import type { CharacterDefinition, ImageAsset, Story } from '../types'
import { findCharacter, resolveStageCharacters } from '../characters'
import { SceneStage } from '../components/SceneStage'

interface StoryPlayerProps {
  story: Story
  backgrounds: ImageAsset[]
  /** Elenco do projeto, já agrupado por identidade (ADR-0016). */
  characters: CharacterDefinition[]
  /** Quando presente, exibe um botão para sair do jogo (voltar ao editor
   *  ou ao menu). */
  onExit?: () => void
  /** Rótulo do botão de saída na tela de fim (padrão: voltar ao editor). */
  exitLabel?: string
}

/**
 * Modo de jogo: percorre a história montada no editor, em tela cheia.
 *
 * Somente leitura — este componente não conhece nada da edição: recebe a
 * Story pronta e apenas a executa. Essa separação é o que permite
 * empacotar o jogo exportado sem as telas de edição (R3).
 *
 * Percurso (ADR-0012): dentro de uma cena, cada clique avança uma entrada
 * da sequência `dialogue`, com fundo e elenco fixos — só a expressão de
 * quem fala muda a cada entrada (ADR-0016). Uma entrada de
 * escolha (R4) mostra as opções como botões — escolher navega para a cena
 * de destino, do início da sequência dela. Ao terminar a sequência sem
 * escolha, segue para `nextSceneId`; sem próxima cena, fim da história.
 */
export function StoryPlayer({
  story,
  backgrounds,
  characters,
  onExit,
  exitLabel = 'Voltar ao editor'
}: StoryPlayerProps): JSX.Element {
  const [currentSceneId, setCurrentSceneId] = useState(story.startSceneId)
  const [entryIndex, setEntryIndex] = useState(0)
  const [finished, setFinished] = useState(false)

  const scene =
    story.scenes.find((s) => s.id === currentSceneId) ?? story.scenes[0]
  const background = backgrounds.find((a) => a.id === scene.backgroundId) ?? null
  const stageCharacters = resolveStageCharacters(scene, entryIndex, characters)
  const entry = scene.dialogue[entryIndex] ?? null
  const speaker = entry?.type === 'line' ? findCharacter(characters, entry.speakerId) : null

  function goToScene(targetSceneId: string | null | undefined): void {
    // Destino vazio ou removido do grafo conta como fim da história.
    if (!targetSceneId || !story.scenes.some((s) => s.id === targetSceneId)) {
      setFinished(true)
      return
    }
    setCurrentSceneId(targetSceneId)
    setEntryIndex(0)
  }

  function restart(): void {
    setCurrentSceneId(story.startSceneId)
    setEntryIndex(0)
    setFinished(false)
  }

  // Clique em qualquer lugar do palco: avança uma entrada da sequência.
  function handleStageClick(): void {
    if (finished) return
    // Numa escolha, o avanço acontece apenas pelos botões (R4).
    if (entry?.type === 'choice') return
    if (entryIndex + 1 < scene.dialogue.length) {
      setEntryIndex(entryIndex + 1)
    } else {
      // Fim da sequência sem escolha: continuação linear ou fim (ADR-0012).
      goToScene(scene.nextSceneId)
    }
  }

  const showChoiceButtons = !finished && entry?.type === 'choice'

  return (
    <div className="player-root" onClick={handleStageClick}>
      <SceneStage
        background={background}
        characters={stageCharacters}
        speakerName={finished ? '' : (speaker?.name ?? '')}
        dialogueText={finished ? '' : (entry?.text ?? '')}
      >
        {showChoiceButtons && entry.type === 'choice' && (
          <div className="player-choices">
            {entry.options.map((option) => (
              <button
                key={option.id}
                type="button"
                className="player-choice-button"
                onClick={(e) => {
                  e.stopPropagation()
                  goToScene(option.targetSceneId)
                }}
              >
                {option.text}
              </button>
            ))}
          </div>
        )}

        {!finished && entry?.type !== 'choice' && (
          <div className="player-advance-hint">clique para continuar</div>
        )}

        {finished && (
          <div className="player-end">
            <p className="player-end-title">Fim</p>
            <div className="player-end-actions">
              <button
                type="button"
                className="player-choice-button"
                onClick={(e) => {
                  e.stopPropagation()
                  restart()
                }}
              >
                Recomeçar
              </button>
              {onExit && (
                <button
                  type="button"
                  className="player-choice-button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onExit()
                  }}
                >
                  {exitLabel}
                </button>
              )}
            </div>
          </div>
        )}
      </SceneStage>

      {onExit && !finished && (
        <button
          type="button"
          className="player-exit"
          onClick={(e) => {
            e.stopPropagation()
            onExit()
          }}
        >
          ✕ Sair do jogo
        </button>
      )}
    </div>
  )
}
