import { useState, type JSX } from 'react'
import type { CharacterDefinition, ImageAsset, Scene } from '../types'
import { findCharacter } from '../characters'
import { BackgroundPanel } from './BackgroundPanel'
import { CharacterPanel } from './CharacterPanel'
import { DialogueEditor } from './DialogueEditor'
import { ScenePreview } from './ScenePreview'

interface SceneEditorProps {
  /** A cena em edição. */
  scene: Scene
  /** Todas as cenas da história (destinos de opções e próxima cena). */
  allScenes: Scene[]
  backgrounds: ImageAsset[]
  /** Elenco do projeto, agrupado por identidade (ADR-0016). */
  definitions: CharacterDefinition[]
  onPatchScene: (patch: Partial<Scene>) => void
  /** Cria uma cena nova na história e a devolve. */
  onAddScene: () => Scene
  /** Troca a cena ativa (usada por "+ Criar próxima cena"). */
  onNavigateToScene: (sceneId: string) => void
  onImportBackground: (asset: ImageAsset) => void
  onImportCharacters: (assets: ImageAsset[]) => void
}

/**
 * R1: tela do editor de cena — o coração da edição visual direta.
 *
 * Três regiões: painel de fundos (esquerda), palco + sequência de diálogo
 * (centro, ADR-0012) e painel de personagens (direita). O palco mostra a
 * fala selecionada na lista, em tempo real; fundo e personagem valem para
 * a cena inteira.
 *
 * O estado da história vive no EditorApp (fluxo unidirecional): este
 * componente recebe a cena ativa e emite patches.
 */
export function SceneEditor({
  scene,
  allScenes,
  backgrounds,
  definitions,
  onPatchScene,
  onAddScene,
  onNavigateToScene,
  onImportBackground,
  onImportCharacters
}: SceneEditorProps): JSX.Element {
  // Qual entrada da sequência aparece na caixa de diálogo do preview.
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)

  const selectedBackground = backgrounds.find((a) => a.id === scene.backgroundId) ?? null

  // Índice da entrada mostrada no palco: as expressões dependem da
  // POSIÇÃO na sequência (a última usada por cada personagem), não só da
  // entrada isolada (ADR-0016).
  const foundIndex = scene.dialogue.findIndex((e) => e.id === selectedEntryId)
  const previewIndex = foundIndex >= 0 ? foundIndex : 0
  const previewEntry = scene.dialogue[previewIndex] ?? null

  // R1: só os personagens presentes NESTA cena podem falar nela.
  const cast = (['esquerda', 'centro', 'direita'] as const)
    .map((position) => findCharacter(definitions, scene.characters[position]))
    .filter((c): c is CharacterDefinition => c !== null)

  // "+ Criar próxima cena": cria, aponta o nextSceneId e abre a nova cena.
  function createNextScene(): void {
    const next = onAddScene()
    onPatchScene({ nextSceneId: next.id })
    onNavigateToScene(next.id)
    setSelectedEntryId(null)
  }

  return (
    <div className="editor-body">
      <aside className="editor-sidebar">
        <BackgroundPanel
          backgrounds={backgrounds}
          selectedId={scene.backgroundId}
          onSelect={(id) => onPatchScene({ backgroundId: id })}
          onImport={onImportBackground}
        />
      </aside>

      <main className="editor-stage">
        <div className="scene-title-bar">
          <label htmlFor="scene-title">Cena</label>
          <input
            id="scene-title"
            type="text"
            value={scene.title}
            maxLength={60}
            onChange={(e) => onPatchScene({ title: e.target.value })}
          />
        </div>

        <ScenePreview
          scene={scene}
          background={selectedBackground}
          definitions={definitions}
          entryIndex={previewIndex}
        />

        <DialogueEditor
          dialogue={scene.dialogue}
          nextSceneId={scene.nextSceneId}
          allScenes={allScenes}
          cast={cast}
          selectedEntryId={previewEntry?.id ?? null}
          onSelectEntry={setSelectedEntryId}
          onDialogueChange={(dialogue) => onPatchScene({ dialogue })}
          onNextSceneChange={(nextSceneId) => onPatchScene({ nextSceneId })}
          onAddScene={onAddScene}
          onCreateNextScene={createNextScene}
        />
      </main>

      <aside className="editor-sidebar">
        <CharacterPanel
          definitions={definitions}
          characters={scene.characters}
          onCharactersChange={(chars) => onPatchScene({ characters: chars })}
          onImport={onImportCharacters}
        />
      </aside>
    </div>
  )
}
