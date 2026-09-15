/// <reference types="vite/client" />

/**
 * História embutida no jogo exportado. O caminho real é resolvido pelo
 * alias `@story` em electron.vite.config.ts (ADR-0017).
 */
declare module '@story' {
  const project: unknown
  export default project
}
