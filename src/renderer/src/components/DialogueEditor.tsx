import type { JSX } from 'react'
import type { CharacterDefinition, DialogueChoice, DialogueEntry, Scene } from '../types'
import { createLine, createOption, lineToChoice } from '../types'
import { findCharacter } from '../characters'

const NEW_SCENE_VALUE = '__nova__'

interface DialogueEditorProps {
  dialogue: DialogueEntry[]
  nextSceneId: string | null | undefined
  /** Todas as cenas da história (destinos possíveis de opções e da próxima cena). */
  allScenes: Scene[]
  /** Elenco desta cena (personagens presentes), na ordem do palco. */
  cast: CharacterDefinition[]
  /** Entrada destacada no preview do palco. */
  selectedEntryId: string | null
  onSelectEntry: (entryId: string) => void
  onDialogueChange: (dialogue: DialogueEntry[]) => void
  onNextSceneChange: (nextSceneId: string | null) => void
  /** Cria uma cena nova na história e a devolve (destino de opção). */
  onAddScene: () => Scene
  /** Cria a próxima cena, define nextSceneId e navega para editá-la. */
  onCreateNextScene: () => void
}

/**
 * R1: edição da sequência de diálogo da cena — a lista ordenada de falas
 * que o jogador percorre com "avançar", sobre o palco fixo (ADR-0012).
 *
 * R4: a última entrada pode virar uma escolha (pergunta + opções); cada
 * opção aponta para uma cena de destino, escolhida numa lista ou criada
 * ali mesmo. A UI guia a convenção "escolha é o fim da cena": depois de
 * uma escolha não dá para adicionar falas nem definir próxima cena.
 *
 * R2: todo texto (falas, pergunta, opções) é digitado pelo escritor.
 */
export function DialogueEditor({
  dialogue,
  nextSceneId,
  allScenes,
  cast,
  selectedEntryId,
  onSelectEntry,
  onDialogueChange,
  onNextSceneChange,
  onAddScene,
  onCreateNextScene
}: DialogueEditorProps): JSX.Element {
  const lastEntry = dialogue[dialogue.length - 1]
  const endsInChoice = lastEntry?.type === 'choice'

  function patchEntry(entryId: string, patch: Partial<DialogueEntry>): void {
    onDialogueChange(
      dialogue.map((e) => (e.id === entryId ? ({ ...e, ...patch } as DialogueEntry) : e))
    )
  }

  function removeEntry(entryId: string): void {
    onDialogueChange(dialogue.filter((e) => e.id !== entryId))
  }

  function addLine(): void {
    const line = createLine()
    onDialogueChange([...dialogue, line])
    onSelectEntry(line.id)
  }

  // Converte a última fala no fecho de escolha da cena (o texto vira a
  // pergunta) — seguindo a convenção de que a escolha encerra a cena.
  function convertLastLineToChoice(): void {
    if (!lastEntry || lastEntry.type !== 'line') return
    const choice = lineToChoice(lastEntry)
    onDialogueChange([...dialogue.slice(0, -1), choice])
    onSelectEntry(choice.id)
    onNextSceneChange(null)
  }

  function renderChoice(entry: DialogueChoice, index: number): JSX.Element {
    const patchOption = (optionId: string, patch: Partial<(typeof entry.options)[0]>): void =>
      patchEntry(entry.id, {
        options: entry.options.map((o) => (o.id === optionId ? { ...o, ...patch } : o))
      })

    return (
      <li
        key={entry.id}
        className={`dialogue-entry dialogue-entry--choice ${
          entry.id === selectedEntryId ? 'is-selected' : ''
        }`}
        onClick={() => onSelectEntry(entry.id)}
      >
        <div className="dialogue-entry-head">
          <span className="dialogue-entry-index">{index + 1}</span>
          <span className="dialogue-entry-kind">Escolha — encerra a cena</span>
          <button
            type="button"
            className="entry-remove"
            title="Remover a escolha"
            onClick={(e) => {
              e.stopPropagation()
              removeEntry(entry.id)
            }}
          >
            ✕
          </button>
        </div>
        <input
          type="text"
          className="choice-question"
          value={entry.text}
          placeholder="Pergunta ou gancho (ex.: O que fazer agora?)"
          maxLength={200}
          onChange={(e) => patchEntry(entry.id, { text: e.target.value })}
        />
        <ul className="option-list">
          {entry.options.map((option) => (
            <li key={option.id} className="option-row">
              <input
                type="text"
                value={option.text}
                maxLength={80}
                aria-label="Texto da opção"
                onChange={(e) => patchOption(option.id, { text: e.target.value })}
              />
              <span className="option-arrow">→</span>
              <select
                value={option.targetSceneId}
                aria-label="Cena de destino"
                onChange={(e) => {
                  // R4: destino escolhido numa lista de cenas — ou criado
                  // ali mesmo, sem sair do editor.
                  if (e.target.value === NEW_SCENE_VALUE) {
                    const scene = onAddScene()
                    patchOption(option.id, { targetSceneId: scene.id })
                  } else {
                    patchOption(option.id, { targetSceneId: e.target.value })
                  }
                }}
              >
                <option value="">— escolher destino —</option>
                {allScenes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
                <option value={NEW_SCENE_VALUE}>＋ criar cena nova…</option>
              </select>
              <button
                type="button"
                className="entry-remove"
                title="Remover opção"
                onClick={() =>
                  patchEntry(entry.id, {
                    options: entry.options.filter((o) => o.id !== option.id)
                  })
                }
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          className="add-option-button"
          onClick={() => patchEntry(entry.id, { options: [...entry.options, createOption()] })}
        >
          + Adicionar opção
        </button>
      </li>
    )
  }

  return (
    <section className="dialogue-editor">
      <div className="dialogue-editor-head">
        <h2>Sequência de diálogo</h2>
        <span className="dialogue-editor-hint">
          O fundo e os personagens valem para a cena inteira; as falas correm sobre eles.
        </span>
      </div>

      {dialogue.length === 0 && (
        <p className="dialogue-empty-hint">Nenhuma fala ainda — adicione a primeira.</p>
      )}

      <ul className="dialogue-list">
        {dialogue.map((entry, index) =>
          entry.type === 'choice' ? (
            renderChoice(entry, index)
          ) : (
            <li
              key={entry.id}
              className={`dialogue-entry ${entry.id === selectedEntryId ? 'is-selected' : ''}`}
              onClick={() => onSelectEntry(entry.id)}
            >
              <span className="dialogue-entry-index">{index + 1}</span>
              {/* R1: quem fala é escolhido entre os personagens do elenco
                  desta cena — não é texto livre (ADR-0016). */}
              <select
                className="entry-speaker"
                value={entry.speakerId}
                aria-label="Quem fala"
                onChange={(e) => {
                  const speakerId = e.target.value
                  const character = findCharacter(cast, speakerId)
                  patchEntry(entry.id, {
                    speakerId,
                    // Ao trocar de personagem, começa pela expressão padrão.
                    expression: character?.expressions[0]?.name ?? ''
                  })
                }}
              >
                <option value="">— Narração —</option>
                {cast.map((character) => (
                  <option key={character.id} value={character.id}>
                    {character.name}
                  </option>
                ))}
              </select>
              {/* R1: expressão do falante nesta fala; só aparece quando o
                  personagem tem mais de uma variante carregada. */}
              {(() => {
                const character = findCharacter(cast, entry.speakerId)
                if (!character || character.expressions.length <= 1) return null
                return (
                  <select
                    className="entry-expression"
                    value={entry.expression}
                    aria-label="Expressão"
                    onChange={(e) => patchEntry(entry.id, { expression: e.target.value })}
                  >
                    {character.expressions.map((expression) => (
                      <option key={expression.name} value={expression.name}>
                        {expression.label}
                      </option>
                    ))}
                  </select>
                )
              })()}
              <input
                type="text"
                className="entry-text"
                value={entry.text}
                placeholder="Texto da fala…"
                maxLength={400}
                onChange={(e) => patchEntry(entry.id, { text: e.target.value })}
              />
              <button
                type="button"
                className="entry-remove"
                title="Remover fala"
                onClick={(e) => {
                  e.stopPropagation()
                  removeEntry(entry.id)
                }}
              >
                ✕
              </button>
            </li>
          )
        )}
      </ul>

      <div className="dialogue-actions">
        {!endsInChoice && (
          <>
            <button type="button" className="toolbar-button add-line-button" onClick={addLine}>
              + Adicionar fala
            </button>
            <button
              type="button"
              className="toolbar-button to-choice-button"
              disabled={!lastEntry || lastEntry.type !== 'line'}
              title="A última fala vira a pergunta de uma escolha"
              onClick={convertLastLineToChoice}
            >
              Terminar a cena com uma escolha
            </button>
          </>
        )}
        {endsInChoice && (
          <span className="dialogue-editor-hint">
            A cena termina na escolha acima — cada opção leva a outra cena.
          </span>
        )}
      </div>

      {!endsInChoice && (
        <div className="next-scene-row">
          <label htmlFor="next-scene">Ao terminar as falas, seguir para</label>
          <select
            id="next-scene"
            value={nextSceneId ?? ''}
            onChange={(e) => onNextSceneChange(e.target.value === '' ? null : e.target.value)}
          >
            <option value="">— fim da história —</option>
            {allScenes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="toolbar-button create-next-button"
            onClick={onCreateNextScene}
          >
            + Criar próxima cena
          </button>
        </div>
      )}
    </section>
  )
}
