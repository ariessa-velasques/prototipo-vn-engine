import type { JSX } from 'react'
import { EditorApp } from './EditorApp'
import { GameApp } from './GameApp'

// R3: o mesmo código-fonte gera dois artefatos distintos.
// O build normal produz a ferramenta de autoria (EditorApp); o build de
// jogo (`electron-vite build --mode player`) produz o executável do jogo
// (GameApp), que abre direto no modo de jogar, sem as telas de edição.
const isPlayerBuild = import.meta.env.MODE === 'player'

function App(): JSX.Element {
  return isPlayerBuild ? <GameApp /> : <EditorApp />
}

export default App
