import { useRef, useState, type JSX } from 'react'
import type { CharacterDefinition, CharacterPosition, ImageAsset, SceneCharacters } from '../types'

interface CharacterPanelProps {
  /** Elenco disponível no projeto, já agrupado por identidade. */
  definitions: CharacterDefinition[]
  /** Personagens desta cena, por lugar do palco. */
  characters: SceneCharacters
  onCharactersChange: (characters: SceneCharacters) => void
  /** Recebe os arquivos importados (podem ser vários de uma vez). */
  onImport: (assets: ImageAsset[]) => void
}

const POSITIONS: { value: CharacterPosition; label: string }[] = [
  { value: 'esquerda', label: 'Esquerda' },
  { value: 'centro', label: 'Centro' },
  { value: 'direita', label: 'Direita' }
]

let importCounter = 0

/**
 * R1: painel de personagens da cena. Duas funções, ambas visuais:
 *  - gerenciar quem foi carregado no projeto (a galeria lista
 *    PERSONAGENS, não arquivos: as expressões do mesmo personagem
 *    aparecem agrupadas num card só — ADR-0016);
 *  - montar o elenco da cena: escolher um lugar do palco
 *    (esquerda/centro/direita) e clicar no personagem que ocupa ele.
 *
 * O elenco vale para a cena inteira; qual expressão cada um mostra é
 * decidido fala a fala, no editor de diálogo (ADR-0016).
 */
export function CharacterPanel({
  definitions,
  characters,
  onCharactersChange,
  onImport
}: CharacterPanelProps): JSX.Element {
  const [activeSlot, setActiveSlot] = useState<CharacterPosition>('centro')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const occupantId = characters[activeSlot]

  function setSlot(characterId: string | null): void {
    onCharactersChange({ ...characters, [activeSlot]: characterId })
  }

  // R3: os arquivos são lidos como data URLs — ficam no projeto salvo e no
  // jogo exportado (ADR-0014); nada sai do computador do escritor.
  // R1: vários arquivos de uma vez; o agrupamento por personagem vem da
  // convenção de nomes, sem cadastro manual (ADR-0016).
  function handleFilesChosen(event: React.ChangeEvent<HTMLInputElement>): void {
    const files = [...(event.target.files ?? [])]
    if (files.length === 0) return
    Promise.all(
      files.map(
        (file) =>
          new Promise<ImageAsset>((resolve) => {
            importCounter += 1
            const id = `importada-${Date.now()}-${importCounter}`
            const reader = new FileReader()
            reader.onload = () =>
              resolve({
                id,
                // O nome do arquivo (sem extensão) É a convenção.
                label: file.name.replace(/\.[^.]+$/, ''),
                url: String(reader.result),
                imported: true
              })
            reader.readAsDataURL(file)
          })
      )
    ).then(onImport)
    event.target.value = ''
  }

  return (
    <section className="panel">
      <h2 className="panel-title">Personagens</h2>
      <p className="panel-hint">
        Escolha um lugar do palco e clique num personagem para colocá-lo ali. O elenco
        vale para a cena inteira.
      </p>

      <div className="position-picker" role="group" aria-label="Lugar do palco">
        {POSITIONS.map((pos) => (
          <button
            key={pos.value}
            type="button"
            className={`position-button ${activeSlot === pos.value ? 'is-selected' : ''}`}
            onClick={() => setActiveSlot(pos.value)}
          >
            {pos.label}
            <span
              className={`slot-indicator ${characters[pos.value] ? 'is-occupied' : ''}`}
              aria-label={characters[pos.value] ? 'lugar ocupado' : 'lugar vazio'}
            />
          </button>
        ))}
      </div>

      <div className="gallery">
        <button
          type="button"
          className={`gallery-item gallery-item--none ${occupantId === null ? 'is-selected' : ''}`}
          onClick={() => setSlot(null)}
        >
          <span>Ninguém neste lugar</span>
        </button>

        {definitions.map((definition) => {
          const usedElsewhere = POSITIONS.some(
            (p) => p.value !== activeSlot && characters[p.value] === definition.id
          )
          return (
            <button
              key={definition.id}
              type="button"
              className={`gallery-item thumb--portrait ${
                occupantId === definition.id ? 'is-selected' : ''
              } ${usedElsewhere ? 'is-elsewhere' : ''}`}
              title={
                usedElsewhere
                  ? `${definition.name} já está em outro lugar do palco`
                  : definition.name
              }
              disabled={usedElsewhere}
              onClick={() => setSlot(definition.id)}
            >
              <img src={definition.expressions[0]?.url} alt={definition.name} draggable={false} />
              <span className="gallery-item-label">
                {definition.name}
                {definition.expressions.length > 1 && (
                  <span className="expression-count">
                    {definition.expressions.length} expressões
                  </span>
                )}
              </span>
            </button>
          )
        })}

        <button
          type="button"
          className="gallery-import"
          onClick={() => fileInputRef.current?.click()}
          title="Nomeie os arquivos como personagem_expressao.png para agrupar as expressões"
        >
          + Importar sprites (nome_expressão)
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleFilesChosen}
        />
      </div>
    </section>
  )
}
