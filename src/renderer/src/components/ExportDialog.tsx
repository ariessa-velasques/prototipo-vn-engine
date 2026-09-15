import { useEffect, useRef, useState, type JSX } from 'react'

type ExportTarget = 'windows' | 'linux' | 'mac'

interface ExportResult {
  ok: boolean
  path?: string
  canceled?: boolean
  error?: string
}

interface ExportDialogProps {
  /** Conteúdo do projeto (formato ProjectFile) a embutir no executável. */
  projectContent: string
  onClose: () => void
}

const TARGETS: { id: ExportTarget; label: string; hint: string }[] = [
  { id: 'windows', label: 'Windows', hint: 'instalador .exe' },
  { id: 'linux', label: 'Linux', hint: 'arquivo .AppImage' },
  { id: 'mac', label: 'macOS', hint: 'imagem .dmg' }
]

type Status = 'escolhendo' | 'gerando' | 'pronto' | 'erro'

/**
 * R3: geração do executável do jogo pela própria ferramenta (ADR-0017).
 *
 * O escritor escolhe o sistema operacional, indica a pasta de destino e a
 * ferramenta produz um executável independente — que roda numa máquina
 * sem a engine instalada e sem as telas de edição.
 */
export function ExportDialog({ projectContent, onClose }: ExportDialogProps): JSX.Element {
  const [target, setTarget] = useState<ExportTarget>('windows')
  const [status, setStatus] = useState<Status>('escolhendo')
  const [log, setLog] = useState<string[]>([])
  const [message, setMessage] = useState('')
  const [outputPath, setOutputPath] = useState('')
  const [unavailable, setUnavailable] = useState<string | null>(null)
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    window.api?.exportarDisponivel().then((r) => {
      if (!r.ok) setUnavailable(r.motivo ?? 'Exportação indisponível.')
    })
  }, [])

  // Progresso do build chega do processo principal em tempo real.
  useEffect(() => {
    const unsubscribe = window.api?.aoProgredirExport((linha) => {
      setLog((atual) => [...atual.slice(-400), linha])
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [log])

  async function generate(): Promise<void> {
    setStatus('gerando')
    setLog([])
    setMessage('')
    // Uma falha do próprio canal (handler ausente, processo encerrado) não
    // pode deixar o diálogo preso em "Gerando…".
    const result: ExportResult | undefined = await window.api
      ?.exportarJogo(target, projectContent)
      .catch((err: unknown) => ({ ok: false, error: String(err) }))
    if (result?.ok) {
      setStatus('pronto')
      setOutputPath(result.path ?? '')
      setMessage('Executável gerado.')
    } else if (result?.canceled) {
      setStatus('escolhendo')
    } else {
      setStatus('erro')
      setMessage(result?.error ?? 'Falha ao gerar o executável.')
    }
  }

  const generating = status === 'gerando'

  return (
    <div className="modal-backdrop" onClick={generating ? undefined : onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <header className="modal-head">
          <h2>Gerar executável do jogo</h2>
          <button
            type="button"
            className="entry-remove"
            disabled={generating}
            onClick={onClose}
            title="Fechar"
          >
            ✕
          </button>
        </header>

        <p className="modal-hint">
          O executável roda em outro computador sem a engine instalada: ele contém a
          história, as imagens e o modo de jogo — nunca as telas de edição.
        </p>

        {unavailable ? (
          <p className="modal-error">
            {unavailable} A geração de executável exige o editor rodando a partir do
            código-fonte do projeto, com as dependências instaladas.
          </p>
        ) : (
          <>
            <div className="target-picker" role="group" aria-label="Sistema operacional">
              {TARGETS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`target-option ${target === t.id ? 'is-selected' : ''}`}
                  disabled={generating}
                  onClick={() => setTarget(t.id)}
                >
                  <span className="target-label">{t.label}</span>
                  <span className="target-hint">{t.hint}</span>
                </button>
              ))}
            </div>

            {log.length > 0 && (
              <pre className="export-log" ref={logRef}>
                {log.join('\n')}
              </pre>
            )}

            {message && (
              <p className={status === 'erro' ? 'modal-error' : 'modal-success'}>{message}</p>
            )}

            <footer className="modal-actions">
              {status === 'pronto' && outputPath && (
                <button
                  type="button"
                  className="toolbar-button"
                  onClick={() => window.api?.abrirPasta(outputPath)}
                >
                  Abrir pasta
                </button>
              )}
              <button
                type="button"
                className="toolbar-button"
                disabled={generating}
                onClick={onClose}
              >
                Fechar
              </button>
              <button
                type="button"
                className="toolbar-button toolbar-button--primary"
                disabled={generating}
                onClick={generate}
              >
                {generating ? 'Gerando…' : 'Escolher pasta e gerar'}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  )
}
