import type { JSX, ReactNode } from 'react'
import type { ImageAsset } from '../types'
import type { StageCharacter } from '../characters'

interface SceneStageProps {
  background: ImageAsset | null
  /** Personagens resolvidos (use resolveStageCharacters). */
  characters: StageCharacter[]
  /** Nome de quem fala na entrada atual (vazio oculta a etiqueta). */
  speakerName?: string
  /** Texto exibido na caixa de diálogo (fala ou pergunta da escolha). */
  dialogueText?: string
  /** Conteúdo extra sobreposto ao palco (ex.: botões de escolha no jogo). */
  children?: ReactNode
}

/**
 * O palco: renderização pura de uma cena — fundo, até três sprites
 * posicionados (esquerda/centro/direita) e a caixa de diálogo clássica de
 * visual novel (nome de quem fala em destaque sobre o texto).
 *
 * O elenco e as posições são fixos durante a cena; o que muda por fala é
 * o texto e a EXPRESSÃO do personagem que fala (ADR-0016) — quem não está
 * falando é levemente escurecido, convenção visual do gênero.
 *
 * Componente compartilhado entre o preview do editor (R1) e o modo de
 * jogo: garante que o que o escritor vê ao editar é exatamente o que o
 * jogador vê ao jogar.
 */
export function SceneStage({
  background,
  characters,
  speakerName = '',
  dialogueText = '',
  children
}: SceneStageProps): JSX.Element {
  const hasDialogue = speakerName.trim() !== '' || dialogueText.trim() !== ''
  const someoneSpeaking = characters.some((c) => c.speaking)

  return (
    <div className="scene-stage">
      {background && (
        <img className="scene-stage-background" src={background.url} alt="" draggable={false} />
      )}

      {characters.map((character) => (
        <img
          key={character.position}
          className={`scene-stage-character scene-stage-character--${character.position} ${
            someoneSpeaking && !character.speaking ? 'is-dimmed' : ''
          }`}
          src={character.url}
          alt=""
          draggable={false}
        />
      ))}

      {hasDialogue && (
        <div className="dialogue-box">
          {speakerName.trim() !== '' && (
            <div className="dialogue-box-name">{speakerName}</div>
          )}
          {dialogueText.trim() !== '' && (
            <p className="dialogue-box-text">{dialogueText}</p>
          )}
        </div>
      )}

      {children}
    </div>
  )
}
