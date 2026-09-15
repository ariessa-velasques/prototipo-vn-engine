import { useEffect, useState, type JSX } from 'react'
import type { ProjectFile } from './types'
import { BUILTIN_BACKGROUNDS, BUILTIN_CHARACTERS } from './assetCatalog'
import { buildCharacterDefinitions } from './characters'
import { StoryPlayer } from './player/StoryPlayer'
import { GameMenu } from './player/GameMenu'
import projectData from '@story'

/**
 * R3: raiz do jogo exportado. Este componente é usado apenas no build de
 * jogo (`--mode player`): abre direto na experiência de jogo, sem nenhuma
 * tela de edição — o executável distribuído contém somente a história, o
 * player e o menu inicial (adicional de demonstração, fora de R1–R4).
 *
 * O projeto vem do alias `@story` (formato ADR-0014: história + imagens
 * importadas como data URLs), embutido no executável em tempo de build
 * (ADR-0010/ADR-0017): nada é carregado de rede.
 */
const project = projectData as unknown as ProjectFile
const story = project.story
const backgrounds = [...BUILTIN_BACKGROUNDS, ...project.importedBackgrounds]
// Mesmo agrupamento por identidade usado no editor (ADR-0016).
const characters = buildCharacterDefinitions([
  ...BUILTIN_CHARACTERS,
  ...project.importedCharacters
])

export function GameApp(): JSX.Element {
  const [started, setStarted] = useState(false)

  // O <title> do HTML é o da ferramenta de autoria; no jogo exportado a
  // janela leva o título da história. O efeito fica DENTRO do componente,
  // nunca no escopo do módulo: App.tsx importa este arquivo também no
  // build do editor, e um efeito de módulo renomearia a janela do editor.
  useEffect(() => {
    document.title = story.title || 'Visual Novel'
  }, [])

  return (
    <div className="game-app">
      {started ? (
        <StoryPlayer
          story={story}
          backgrounds={backgrounds}
          characters={characters}
          onExit={() => setStarted(false)}
          exitLabel="Voltar ao menu"
        />
      ) : (
        <GameMenu
          title={story.title || 'Visual Novel'}
          about={story.about ?? ''}
          onStart={() => setStarted(true)}
          onQuit={() => window.close()}
        />
      )}
    </div>
  )
}
