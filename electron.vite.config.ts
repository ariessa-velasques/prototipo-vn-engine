import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

/**
 * R3: o build de jogo (`--mode player`) embute a história pelo alias
 * `@story`. Por padrão ele aponta para o arquivo de exemplo do
 * repositório; a exportação disparada pela própria ferramenta (ADR-0017)
 * define VN_STORY_PATH para um arquivo temporário com o projeto atual,
 * sem tocar no arquivo-fonte.
 */
const storyPath =
  process.env.VN_STORY_PATH ?? resolve('src/renderer/src/story/story.json')

export default defineConfig({
  main: {},
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@story': storyPath
      }
    },
    plugins: [react()]
  }
})
