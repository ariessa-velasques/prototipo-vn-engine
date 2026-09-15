import { useState, type JSX } from 'react'

interface GameMenuProps {
  title: string
  /** Texto da tela "Sobre", escrito pelo escritor no editor de menu (R2). */
  about: string
  /** Ausente no preview do editor de menu (botão desabilitado). */
  onStart?: () => void
  /** Ausente no preview do editor de menu (botão desabilitado). */
  onQuit?: () => void
}

/**
 * Menu inicial do jogo exportado: estrutura fixa (Jogar, Sobre, Sair),
 * conteúdo do escritor (título e texto do "Sobre").
 *
 * Nota de escopo: este menu é um adicional de demonstração da experiência
 * do jogo exportado — NÃO deriva de nenhum requisito do mapeamento
 * sistemático (R1–R4) e por isso não aparece na tabela de rastreabilidade
 * do ARCHITECTURE.md.
 */
export function GameMenu({ title, about, onStart, onQuit }: GameMenuProps): JSX.Element {
  const [showAbout, setShowAbout] = useState(false)

  if (showAbout) {
    return (
      <div className="game-menu">
        <h1 className="game-menu-title game-menu-title--small">Sobre</h1>
        <p className="game-about-text">
          {about.trim() !== '' ? about : 'O escritor ainda não preencheu esta tela.'}
        </p>
        <div className="game-menu-actions">
          <button
            type="button"
            className="player-choice-button"
            onClick={() => setShowAbout(false)}
          >
            Voltar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="game-menu">
      <h1 className="game-menu-title">{title}</h1>
      <div className="game-menu-actions">
        <button
          type="button"
          className="player-choice-button"
          disabled={!onStart}
          onClick={onStart}
        >
          Jogar
        </button>
        <button
          type="button"
          className="player-choice-button"
          onClick={() => setShowAbout(true)}
        >
          Sobre
        </button>
        <button
          type="button"
          className="player-choice-button"
          disabled={!onQuit}
          onClick={onQuit}
        >
          Sair
        </button>
      </div>
      <p className="game-menu-footer">criado com o protótipo de engine no-code para visual novels</p>
    </div>
  )
}
