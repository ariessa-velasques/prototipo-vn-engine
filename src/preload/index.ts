import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

/**
 * Ponte segura entre o renderer e o processo principal (contextIsolation).
 * A interface nunca toca o disco diretamente: salvar/abrir projeto passa
 * por aqui e é resolvido pelo processo principal (ADR-0014).
 */
const api = {
  /** Abre o diálogo nativo de salvar e grava o projeto. */
  salvarProjeto: (conteudo: string): Promise<SalvarResultado> =>
    ipcRenderer.invoke('projeto:salvar', conteudo),
  /** Abre o diálogo nativo de abrir e devolve o conteúdo do projeto. */
  abrirProjeto: (): Promise<AbrirResultado> => ipcRenderer.invoke('projeto:abrir'),

  /** R3: informa se a geração de executável está disponível (ADR-0017). */
  exportarDisponivel: (): Promise<{ ok: boolean; motivo?: string }> =>
    ipcRenderer.invoke('jogo:exportar-disponivel'),
  /** R3: gera o executável do jogo para o sistema escolhido. */
  exportarJogo: (alvo: ExportTarget, conteudo: string): Promise<ExportarResultado> =>
    ipcRenderer.invoke('jogo:exportar', alvo, conteudo),
  /** Assina o progresso do build; devolve a função para cancelar a assinatura. */
  aoProgredirExport: (callback: (linha: string) => void): (() => void) => {
    const handler = (_event: unknown, linha: string): void => callback(linha)
    ipcRenderer.on('jogo:exportar-progresso', handler)
    return () => ipcRenderer.removeListener('jogo:exportar-progresso', handler)
  },
  /** Abre a pasta do executável gerado no gerenciador de arquivos. */
  abrirPasta: (caminho: string): Promise<void> =>
    ipcRenderer.invoke('jogo:abrir-pasta', caminho)
}

export type ExportTarget = 'windows' | 'linux' | 'mac'

export interface ExportarResultado {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}

export interface SalvarResultado {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}

export interface AbrirResultado {
  ok: boolean
  path?: string
  conteudo?: string
  canceled?: boolean
  error?: string
}

export type Api = typeof api

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
