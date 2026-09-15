import { useMemo, useState, type JSX } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
  type NodeChange
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import type { DialogueEntry, Scene, Story } from '../types'
import { createOption, lineToChoice, createLine } from '../types'

const NEXT_EDGE_PREFIX = 'next--'

interface BranchEditorProps {
  story: Story
  onStoryChange: (story: Story) => void
  /** Cria uma cena nova na história e a devolve (botão "+ Nova cena"). */
  onAddScene: () => Scene
  /** Chamado quando o escritor pede para editar uma cena (duplo clique no nó). */
  onEditScene: (sceneId: string) => void
}

/**
 * R4: editor visual de ramificações — o grafo da história.
 *
 * Cada cena é um nó. As arestas são derivadas do modelo de diálogo
 * (ADR-0012, mantendo o princípio do ADR-0008 de grafo como projeção
 * pura do mesmo dado):
 *  - cena com `nextSceneId` → aresta simples (continuação automática);
 *  - cena terminando em entrada de escolha → uma aresta por opção,
 *    rotulada com o texto da opção.
 *
 * Conectar dois nós arrastando: se a cena de origem termina em escolha,
 * cria uma nova opção; caso contrário, define/troca o nextSceneId.
 * Tudo é feito graficamente — o escritor nunca representa o fluxo em
 * texto ou código.
 */
export function BranchEditor({
  story,
  onStoryChange,
  onAddScene,
  onEditScene
}: BranchEditorProps): JSX.Element {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  // R4: cada Scene vira um nó do grafo, na posição escolhida pelo escritor.
  const nodes: Node[] = useMemo(
    () =>
      story.scenes.map((scene) => ({
        id: scene.id,
        position: scene.graphPosition,
        data: {
          label:
            scene.id === story.startSceneId ? `▶ ${scene.title} (início)` : scene.title
        },
        className: [
          'story-node',
          scene.id === story.startSceneId ? 'story-node--start' : '',
          scene.id === selectedSceneId ? 'story-node--selected' : ''
        ].join(' ')
      })),
    [story, selectedSceneId]
  )

  // R4: arestas derivadas do diálogo — opções de escolha (rotuladas) e
  // continuação linear via nextSceneId (tracejada, sem rótulo).
  const edges: Edge[] = useMemo(() => {
    const result: Edge[] = []
    for (const scene of story.scenes) {
      for (const entry of scene.dialogue) {
        if (entry.type !== 'choice') continue
        for (const option of entry.options) {
          if (option.targetSceneId === '') continue
          result.push({
            id: option.id,
            source: scene.id,
            target: option.targetSceneId,
            label: option.text,
            markerEnd: { type: MarkerType.ArrowClosed },
            className: option.id === selectedEdgeId ? 'story-edge--selected' : ''
          })
        }
      }
      if (scene.nextSceneId) {
        const id = `${NEXT_EDGE_PREFIX}${scene.id}`
        result.push({
          id,
          source: scene.id,
          target: scene.nextSceneId,
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { strokeDasharray: '6 4' },
          className: id === selectedEdgeId ? 'story-edge--selected' : ''
        })
      }
    }
    return result
  }, [story, selectedEdgeId])

  // Aplica de volta à Story apenas as mudanças de posição (arrastar nó);
  // o restante do grafo é sempre derivado.
  function handleNodesChange(changes: NodeChange[]): void {
    const moved = new Map<string, { x: number; y: number }>()
    for (const change of changes) {
      if (change.type === 'position' && change.position) {
        moved.set(change.id, change.position)
      }
    }
    if (moved.size === 0) return
    onStoryChange({
      ...story,
      scenes: story.scenes.map((s) =>
        moved.has(s.id) ? { ...s, graphPosition: moved.get(s.id)! } : s
      )
    })
  }

  // R4: conectar dois nós. Origem terminando em escolha → nova opção
  // apontando para o destino; caso contrário → define (ou troca) o
  // nextSceneId — a manipulação direta substitui a aresta anterior.
  function handleConnect(connection: Connection): void {
    if (!connection.source || !connection.target) return
    onStoryChange({
      ...story,
      scenes: story.scenes.map((s) => {
        if (s.id !== connection.source) return s
        const last = s.dialogue[s.dialogue.length - 1]
        if (last?.type === 'choice') {
          const option = createOption(connection.target)
          const dialogue = s.dialogue.map((e) =>
            e.id === last.id && e.type === 'choice'
              ? { ...e, options: [...e.options, option] }
              : e
          )
          return { ...s, dialogue }
        }
        return { ...s, nextSceneId: connection.target }
      })
    })
  }

  function addScene(): void {
    const scene = onAddScene()
    setSelectedSceneId(scene.id)
    setSelectedEdgeId(null)
  }

  // Transforma o fecho da cena selecionada em escolha (atalho do grafo).
  function endSelectedSceneWithChoice(): void {
    if (!selectedSceneId) return
    onStoryChange({
      ...story,
      scenes: story.scenes.map((s) => {
        if (s.id !== selectedSceneId) return s
        const last = s.dialogue[s.dialogue.length - 1]
        if (last?.type === 'choice') return s
        const base = last?.type === 'line' ? last : createLine()
        const dialogue: DialogueEntry[] =
          last?.type === 'line'
            ? [...s.dialogue.slice(0, -1), lineToChoice(base)]
            : [...s.dialogue, lineToChoice(base)]
        return { ...s, dialogue, nextSceneId: null }
      })
    })
  }

  function removeSelectedScene(): void {
    if (!selectedSceneId || selectedSceneId === story.startSceneId) return
    onStoryChange({
      ...story,
      scenes: story.scenes
        .filter((s) => s.id !== selectedSceneId)
        .map((s) => ({
          ...s,
          nextSceneId: s.nextSceneId === selectedSceneId ? null : s.nextSceneId,
          dialogue: s.dialogue.map((e) =>
            e.type === 'choice'
              ? {
                  ...e,
                  options: e.options.map((o) =>
                    o.targetSceneId === selectedSceneId ? { ...o, targetSceneId: '' } : o
                  )
                }
              : e
          )
        }))
    })
    setSelectedSceneId(null)
  }

  // Remove a conexão selecionada: opção de escolha ou continuação linear.
  function removeSelectedEdge(): void {
    if (!selectedEdgeId) return
    if (selectedEdgeId.startsWith(NEXT_EDGE_PREFIX)) {
      const sceneId = selectedEdgeId.slice(NEXT_EDGE_PREFIX.length)
      onStoryChange({
        ...story,
        scenes: story.scenes.map((s) => (s.id === sceneId ? { ...s, nextSceneId: null } : s))
      })
    } else {
      onStoryChange({
        ...story,
        scenes: story.scenes.map((s) => ({
          ...s,
          dialogue: s.dialogue.map((e) =>
            e.type === 'choice'
              ? { ...e, options: e.options.filter((o) => o.id !== selectedEdgeId) }
              : e
          )
        }))
      })
    }
    setSelectedEdgeId(null)
  }

  const canRemoveScene =
    selectedSceneId !== null && selectedSceneId !== story.startSceneId

  return (
    <div className="branch-editor">
      <div className="branch-toolbar">
        <button type="button" className="toolbar-button" onClick={addScene}>
          + Nova cena
        </button>
        <button
          type="button"
          className="toolbar-button"
          disabled={selectedSceneId === null}
          onClick={() => selectedSceneId && onEditScene(selectedSceneId)}
        >
          Editar cena selecionada
        </button>
        <button
          type="button"
          className="toolbar-button"
          disabled={selectedSceneId === null}
          onClick={endSelectedSceneWithChoice}
        >
          Terminar cena com escolha
        </button>
        <button
          type="button"
          className="toolbar-button toolbar-button--danger"
          disabled={!canRemoveScene}
          onClick={removeSelectedScene}
        >
          Excluir cena
        </button>
        <button
          type="button"
          className="toolbar-button toolbar-button--danger"
          disabled={selectedEdgeId === null}
          onClick={removeSelectedEdge}
        >
          Remover conexão
        </button>
        <span className="branch-hint">
          Arraste do conector de um nó até outro para conectar cenas · rotulada = opção
          de escolha · tracejada = continuação automática · duplo clique abre a cena
        </span>
      </div>

      <div className="branch-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          colorMode="dark"
          fitView={story.scenes.length > 1}
          onNodesChange={handleNodesChange}
          onConnect={handleConnect}
          onNodeClick={(_, node) => {
            setSelectedSceneId(node.id)
            setSelectedEdgeId(null)
          }}
          onNodeDoubleClick={(_, node) => onEditScene(node.id)}
          onEdgeClick={(_, edge) => {
            setSelectedEdgeId(edge.id)
            setSelectedSceneId(null)
          }}
          onPaneClick={() => {
            setSelectedSceneId(null)
            setSelectedEdgeId(null)
          }}
        >
          <Background gap={24} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  )
}
