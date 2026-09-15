import { app, shell, dialog, ipcMain, BrowserWindow } from 'electron'
import { readFile, writeFile, mkdtemp } from 'fs/promises'
import { existsSync } from 'fs'
import { spawn } from 'child_process'
import { tmpdir } from 'os'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

const PROJECT_FILTERS = [
  { name: 'Projeto de Visual Novel', extensions: ['vnproj', 'json'] }
]

/**
 * Persistência de projetos (ADR-0014): o renderer não acessa disco — ele
 * envia/recebe o conteúdo do projeto por IPC, e o processo principal cuida
 * dos diálogos nativos de salvar/abrir e da leitura/escrita do arquivo.
 * Tudo local (R3): nenhum dado sai da máquina do escritor.
 */
function registerProjectIpc(): void {
  ipcMain.handle('projeto:salvar', async (_event, conteudo: string) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
      title: 'Salvar projeto',
      defaultPath: 'minha-visual-novel.vnproj',
      filters: PROJECT_FILTERS
    })
    if (canceled || !filePath) return { ok: false, canceled: true }
    try {
      await writeFile(filePath, conteudo, 'utf-8')
      return { ok: true, path: filePath }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })

  ipcMain.handle('projeto:abrir', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      title: 'Abrir projeto',
      properties: ['openFile'],
      filters: PROJECT_FILTERS
    })
    if (canceled || filePaths.length === 0) return { ok: false, canceled: true }
    try {
      const conteudo = await readFile(filePaths[0], 'utf-8')
      return { ok: true, path: filePaths[0], conteudo }
    } catch (error) {
      return { ok: false, error: String(error) }
    }
  })
}

// R3: o mesmo processo principal serve os dois artefatos: a ferramenta de
// autoria (build normal) e o jogo exportado (build `--mode player`). O
// modo é resolvido em tempo de build pelo electron-vite.
const isPlayerBuild = import.meta.env.MODE === 'player'

// R3: execução desktop — este processo principal do Electron cria a janela
// nativa da aplicação. Tudo roda localmente: não há servidor nem chamadas
// de rede em nenhum ponto da aplicação.
/** Alvos de exportação oferecidos na interface (ADR-0017). */
const EXPORT_TARGETS = {
  windows: { args: ['--win', 'nsis'], label: 'Windows (.exe)' },
  linux: { args: ['--linux', 'AppImage'], label: 'Linux (AppImage)' },
  mac: { args: ['--mac', 'dmg'], label: 'macOS (.dmg)' }
} as const

type ExportTarget = keyof typeof EXPORT_TARGETS

/**
 * Raiz do projeto (onde estão package.json e node_modules). Em
 * desenvolvimento o app path é a própria raiz; o diretório de trabalho
 * serve de alternativa quando o editor é iniciado por outro caminho.
 */
function projectRoot(): string {
  const candidatos = [app.getAppPath(), process.cwd()]
  return candidatos.find((dir) => existsSync(join(dir, 'package.json'))) ?? app.getAppPath()
}

/**
 * A exportação roda a cadeia de build do próprio projeto, então só está
 * disponível com o editor executando a partir do código-fonte, com as
 * dependências instaladas (limitação documentada na ADR-0017).
 */
function exportAvailability(): { ok: boolean; motivo?: string } {
  const root = projectRoot()
  if (!existsSync(join(root, 'package.json'))) {
    return { ok: false, motivo: 'Projeto não encontrado a partir do executável do editor.' }
  }
  const builder = join(root, 'node_modules', '.bin', 'electron-builder')
  if (!existsSync(builder)) {
    return { ok: false, motivo: 'Dependências de build não instaladas (node_modules).' }
  }
  return { ok: true }
}

/** Roda um comando, transmitindo a saída para a janela em tempo real. */
function runStep(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
  onOutput: (linha: string) => void
): Promise<{ ok: boolean; saida: string }> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: projectRoot(),
      env: { ...process.env, ...env },
      shell: process.platform === 'win32'
    })
    let saida = ''
    const capture = (chunk: Buffer): void => {
      const texto = chunk.toString()
      saida += texto
      for (const linha of texto.split('\n')) {
        if (linha.trim() !== '') onOutput(linha.trimEnd())
      }
    }
    child.stdout.on('data', capture)
    child.stderr.on('data', capture)
    child.on('error', (err) => {
      onOutput(String(err))
      resolve({ ok: false, saida: saida + String(err) })
    })
    child.on('close', (code) => resolve({ ok: code === 0, saida }))
  })
}

/**
 * R3: exportação do jogo como executável independente, disparada pela
 * própria ferramenta (ADR-0017).
 *
 * O projeto atual é gravado num arquivo temporário, apontado ao build
 * pelo alias `@story` (VN_STORY_PATH) — o arquivo-fonte do repositório
 * não é tocado. Em seguida rodam o build do renderer em modo `player`
 * (sem as telas de edição) e o electron-builder para o sistema escolhido.
 * O artefato final roda numa máquina sem a engine instalada.
 */
function registerExportIpc(): void {
  ipcMain.handle('jogo:exportar-disponivel', async () => exportAvailability())

  ipcMain.handle(
    'jogo:exportar',
    async (event, alvo: ExportTarget, conteudoProjeto: string) => {
      const disponivel = exportAvailability()
      if (!disponivel.ok) return { ok: false, error: disponivel.motivo }
      const target = EXPORT_TARGETS[alvo]
      if (!target) return { ok: false, error: 'Sistema operacional desconhecido.' }

      const janela = BrowserWindow.fromWebContents(event.sender)
      const escolha = await dialog.showOpenDialog({
        title: 'Onde salvar o executável do jogo',
        properties: ['openDirectory', 'createDirectory']
      })
      if (escolha.canceled || escolha.filePaths.length === 0) {
        return { ok: false, canceled: true }
      }
      const destino = escolha.filePaths[0]

      const progresso = (linha: string): void => {
        if (!janela?.isDestroyed()) janela?.webContents.send('jogo:exportar-progresso', linha)
      }

      try {
        // 1. história do projeto atual num arquivo temporário
        const pasta = await mkdtemp(join(tmpdir(), 'vn-export-'))
        const storyPath = join(pasta, 'story.json')
        await writeFile(storyPath, conteudoProjeto, 'utf-8')
        const env = { VN_STORY_PATH: storyPath }

        // 2. build do jogo (renderer em modo player, sem o editor)
        progresso(`Preparando o jogo para ${target.label}…`)
        const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
        const build = await runStep(
          npx,
          ['electron-vite', 'build', '--mode', 'player'],
          env,
          progresso
        )
        if (!build.ok) return { ok: false, error: 'Falha ao preparar o jogo.' }

        // 3. empacotamento para o sistema escolhido, direto na pasta destino
        progresso(`Gerando o executável (${target.label})…`)
        const pack = await runStep(
          npx,
          [
            'electron-builder',
            ...target.args,
            `--config.directories.output=${destino}`,
            '--config.extraMetadata.name=jogo-visual-novel'
          ],
          env,
          progresso
        )
        if (!pack.ok) {
          const dica = pack.saida.includes('wine')
            ? ' Gerar para Windows a partir deste sistema exige o wine instalado.'
            : alvo === 'mac' && process.platform !== 'darwin'
              ? ' Gerar para macOS exige um computador macOS.'
              : ''
          return { ok: false, error: `Falha ao gerar o executável.${dica}` }
        }

        progresso('Concluído.')
        return { ok: true, path: destino }
      } catch (error) {
        return { ok: false, error: String(error) }
      }
    }
  )

  // Abre a pasta do executável gerado no gerenciador de arquivos.
  ipcMain.handle('jogo:abrir-pasta', async (_event, caminho: string) => {
    await shell.openPath(caminho)
  })
}

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: isPlayerBuild ? 'Visual Novel' : 'Editor de Visual Novel — Protótipo',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Links externos abrem no navegador do sistema, nunca dentro da aplicação.
  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Em desenvolvimento o renderer é servido pelo Vite (HMR); no build final
  // é carregado do arquivo local — sem dependência de internet (R3).
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('br.unipampa.vn-editor-prototipo')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // O jogo exportado não salva nem abre projetos — o IPC de persistência
  // existe só na ferramenta de autoria.
  if (!isPlayerBuild) {
    registerProjectIpc()
    registerExportIpc()
  }

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
