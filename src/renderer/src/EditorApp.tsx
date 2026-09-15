import { useMemo, useState, type JSX } from 'react'
import type { ImageAsset, ProjectFile, Scene, Story } from './types'
import { createScene, isProjectFile } from './types'
import { buildCharacterDefinitions } from './characters'
import { BUILTIN_BACKGROUNDS, BUILTIN_CHARACTERS } from './assetCatalog'
import { SceneEditor } from './components/SceneEditor'
import { BranchEditor } from './components/BranchEditor'
import { MenuEditor } from './components/MenuEditor'
import { ExportDialog } from './components/ExportDialog'
import { StoryPlayer } from './player/StoryPlayer'

/** Os modos da ferramenta de autoria. */
type EditorMode = 'cena' | 'grafo' | 'menu' | 'jogar'

function initialStory(): Story {
  const first = createScene({ x: 80, y: 120 })
  return {
    title: 'Minha visual novel',
    about: '',
    startSceneId: first.id,
    scenes: [first]
  }
}

/**
 * Raiz da ferramenta de autoria: dona do estado da história completa
 * (Story) e da navegação entre o editor de cena (R1), o editor de
 * ramificações (R4), o editor de menu e o modo de jogo.
 *
 * O padrão de estado segue o ADR-0002: um único dono de estado no topo,
 * fluxo unidirecional via props — sem biblioteca de estado.
 *
 * R2: o estado só muda por ações explícitas do escritor (cliques e
 * digitação). Não há nenhum mecanismo de geração automática de conteúdo.
 */
export function EditorApp(): JSX.Element {
  const [story, setStory] = useState<Story>(initialStory)
  const [activeSceneId, setActiveSceneId] = useState<string>(story.startSceneId)
  const [mode, setMode] = useState<EditorMode>('cena')
  // Imagens importadas do computador ficam só em memória nesta etapa
  // (persistência de projetos é escopo de etapa futura).
  const [backgrounds, setBackgrounds] = useState<ImageAsset[]>(BUILTIN_BACKGROUNDS)
  const [characters, setCharacters] = useState<ImageAsset[]>(BUILTIN_CHARACTERS)

  // R1: o elenco do projeto é DERIVADO dos arquivos de sprite, agrupados
  // pela convenção `nome_expressao` — não há cadastro manual (ADR-0016).
  const definitions = useMemo(() => buildCharacterDefinitions(characters), [characters])

  const activeScene =
    story.scenes.find((s) => s.id === activeSceneId) ?? story.scenes[0]

  function patchScene(sceneId: string, patch: Partial<Scene>): void {
    setStory((current) => ({
      ...current,
      scenes: current.scenes.map((s) => (s.id === sceneId ? { ...s, ...patch } : s))
    }))
  }

  /**
   * Cria uma cena nova na história e a devolve — usada pelo grafo
   * ("+ Nova cena") e pelo editor de cena ("+ Criar próxima cena" e
   * "criar cena nova" como destino de uma opção de escolha).
   */
  function addScene(): Scene {
    const offset = story.scenes.length
    const scene = {
      ...createScene({ x: 120 + (offset % 4) * 220, y: 120 + offset * 70 }),
      // Numera pela quantidade real de cenas (o contador interno do
      // createScene é inflado pela dupla invocação do StrictMode em dev).
      title: `Cena ${offset + 1}`
    }
    setStory((current) => ({ ...current, scenes: [...current.scenes, scene] }))
    return scene
  }

  // Mensagem curta de status das ações de arquivo (salvo/aberto/erro).
  const [fileFeedback, setFileFeedback] = useState<string>('')
  // R3: diálogo de geração do executável do jogo (ADR-0017).
  const [exporting, setExporting] = useState(false)

  /** Monta o arquivo de projeto: história + imagens importadas (ADR-0014). */
  function buildProjectFile(): ProjectFile {
    return {
      version: 2,
      story,
      importedBackgrounds: backgrounds.filter((a) => a.imported),
      importedCharacters: characters.filter((a) => a.imported)
    }
  }

  async function saveProject(): Promise<void> {
    const result = await window.api?.salvarProjeto(
      JSON.stringify(buildProjectFile(), null, 2)
    )
    if (result?.ok) setFileFeedback(`Projeto salvo em ${result.path}`)
    else if (result && !result.canceled) setFileFeedback('Não foi possível salvar o projeto.')
  }

  async function openProject(): Promise<void> {
    const result = await window.api?.abrirProjeto()
    if (!result?.ok || !result.conteudo) {
      if (result && !result.canceled) setFileFeedback('Não foi possível abrir o arquivo.')
      return
    }
    let parsed: unknown
    try {
      parsed = JSON.parse(result.conteudo)
    } catch {
      setFileFeedback('O arquivo escolhido não é um projeto válido.')
      return
    }
    if (!isProjectFile(parsed)) {
      setFileFeedback('O arquivo escolhido não é um projeto válido.')
      return
    }
    setStory(parsed.story)
    setActiveSceneId(parsed.story.startSceneId)
    setBackgrounds([...BUILTIN_BACKGROUNDS, ...parsed.importedBackgrounds])
    setCharacters([...BUILTIN_CHARACTERS, ...parsed.importedCharacters])
    setMode('cena')
    setFileFeedback(`Projeto aberto: ${result.path}`)
  }

  // R3: baixa o projeto no formato que o build de jogo embute (ADR-0010).
  function exportForGame(): void {
    const blob = new Blob([JSON.stringify(buildProjectFile(), null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'story.json'
    anchor.click()
    URL.revokeObjectURL(url)
  }

  const tabs: { id: EditorMode; label: string }[] = [
    { id: 'cena', label: 'Editor de cena' },
    { id: 'grafo', label: 'Ramificações' },
    { id: 'menu', label: 'Menu do jogo' },
    { id: 'jogar', label: '▶ Jogar' }
  ]

  return (
    <div className="editor-app">
      <header className="editor-header">
        <h1>{story.title}</h1>
        <nav className="mode-tabs" aria-label="Modo do editor">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`mode-tab ${mode === tab.id ? 'is-active' : ''}`}
              onClick={() => setMode(tab.id)}
            >
              {tab.label}
            </button>
          ))}
          {/* R3: gerar o executável fica ao lado de "Jogar" — testar a
              história e distribuí-la são a mesma família de ação. */}
          <button
            type="button"
            className="mode-tab mode-tab--export"
            title="Gera um executável do jogo para rodar em outro computador"
            onClick={() => setExporting(true)}
          >
            ⤓ Gerar executável
          </button>
        </nav>
        <div className="file-actions">
          <button type="button" className="toolbar-button" onClick={openProject}>
            Abrir
          </button>
          <button type="button" className="toolbar-button" onClick={saveProject}>
            Salvar
          </button>
          <button
            type="button"
            className="toolbar-button"
            title="Baixa o projeto em .json (mesmo conteúdo embutido no executável)"
            onClick={exportForGame}
          >
            Exportar .json
          </button>
        </div>
        <span className="editor-header-note">
          {fileFeedback || 'Protótipo — engine no-code para visual novels'}
        </span>
      </header>

      {mode === 'cena' && (
        <SceneEditor
          scene={activeScene}
          allScenes={story.scenes}
          backgrounds={backgrounds}
          definitions={definitions}
          onPatchScene={(patch) => patchScene(activeScene.id, patch)}
          onAddScene={addScene}
          onNavigateToScene={setActiveSceneId}
          onImportBackground={(asset) => setBackgrounds((list) => [...list, asset])}
          onImportCharacters={(assets) => setCharacters((list) => [...list, ...assets])}
        />
      )}

      {mode === 'grafo' && (
        <BranchEditor
          story={story}
          onStoryChange={setStory}
          onAddScene={addScene}
          onEditScene={(sceneId) => {
            setActiveSceneId(sceneId)
            setMode('cena')
          }}
        />
      )}

      {mode === 'menu' && (
        <MenuEditor
          story={story}
          onStoryChange={(patch) => setStory((current) => ({ ...current, ...patch }))}
        />
      )}

      {exporting && (
        <ExportDialog
          projectContent={JSON.stringify(buildProjectFile(), null, 2)}
          onClose={() => setExporting(false)}
        />
      )}

      {mode === 'jogar' && (
        <StoryPlayer
          story={story}
          backgrounds={backgrounds}
          characters={definitions}
          onExit={() => setMode('grafo')}
        />
      )}
    </div>
  )
}
