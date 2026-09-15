import type { JSX } from 'react'
import type { Story } from '../types'
import { GameMenu } from '../player/GameMenu'

interface MenuEditorProps {
  story: Story
  onStoryChange: (patch: Partial<Story>) => void
}

/**
 * Editor do menu do jogo exportado.
 *
 * A estrutura do menu é fixa (Jogar, Sobre, Sair — adicional de
 * demonstração, fora do escopo formal R1–R4), mas o CONTEÚDO é do
 * escritor (R2): o título do jogo e o texto da tela "Sobre" (nome,
 * créditos etc.) são digitados aqui, salvos na Story e exibidos no jogo
 * exportado e no preview ao lado.
 */
export function MenuEditor({ story, onStoryChange }: MenuEditorProps): JSX.Element {
  return (
    <div className="menu-editor">
      <section className="menu-editor-form">
        <h2 className="panel-title">Menu do jogo</h2>
        <p className="panel-hint">
          O menu tem três botões fixos — Jogar, Sobre e Sair. Você escreve o título do
          jogo e o conteúdo da tela &quot;Sobre&quot;.
        </p>

        <div className="menu-editor-field">
          <label htmlFor="game-title">Título do jogo</label>
          <input
            id="game-title"
            type="text"
            value={story.title}
            maxLength={80}
            onChange={(e) => onStoryChange({ title: e.target.value })}
          />
        </div>

        <div className="menu-editor-field">
          <label htmlFor="game-about">Texto da tela &quot;Sobre&quot;</label>
          <textarea
            id="game-about"
            value={story.about}
            rows={10}
            maxLength={2000}
            placeholder={'Escreva aqui as informações do seu jogo:\nautoria, créditos, agradecimentos…'}
            onChange={(e) => onStoryChange({ about: e.target.value })}
          />
        </div>
      </section>

      <section className="menu-editor-preview">
        <h2 className="panel-title">Preview do menu</h2>
        <div className="menu-editor-preview-frame">
          <GameMenu title={story.title} about={story.about} />
        </div>
      </section>
    </div>
  )
}
