import { useRef, type JSX } from 'react'
import type { ImageAsset } from '../types'

interface AssetGalleryProps {
  /** Imagens disponíveis (embutidas + importadas pelo escritor). */
  assets: ImageAsset[]
  /** id da imagem atualmente aplicada à cena, ou null. */
  selectedId: string | null
  /** Chamado quando o escritor clica numa miniatura (ou em "nenhum"). */
  onSelect: (id: string | null) => void
  /** Chamado quando o escritor importa uma imagem do computador. */
  onImport: (asset: ImageAsset) => void
  /** Exibe a opção de limpar a seleção, com este rótulo (ex.: "Sem personagem"). */
  noneLabel?: string
  /** Ajusta a proporção das miniaturas: cenário (16:9) ou retrato (sprite). */
  thumbShape: 'landscape' | 'portrait'
}

let importCounter = 0

/**
 * R1: galeria de seleção visual de imagens. O escritor escolhe clicando na
 * miniatura — não digita caminho de arquivo nem escreve script. Usada tanto
 * para backgrounds quanto para sprites de personagem.
 */
export function AssetGallery({
  assets,
  selectedId,
  onSelect,
  onImport,
  noneLabel,
  thumbShape
}: AssetGalleryProps): JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // R3: a imagem importada é lida como data URL — fica embutida no estado
  // do projeto, o que permite salvá-la no arquivo .vnproj e levá-la para o
  // jogo exportado (ADR-0014). O arquivo nunca sai do computador do
  // escritor — não há upload.
  function handleFileChosen(event: React.ChangeEvent<HTMLInputElement>): void {
    const file = event.target.files?.[0]
    if (!file) return
    importCounter += 1
    const id = `importada-${Date.now()}-${importCounter}`
    const label = file.name.replace(/\.[^.]+$/, '')
    const reader = new FileReader()
    reader.onload = () => {
      const asset: ImageAsset = {
        id,
        label,
        url: String(reader.result),
        imported: true
      }
      onImport(asset)
      onSelect(asset.id)
    }
    reader.readAsDataURL(file)
    event.target.value = ''
  }

  return (
    <div className="gallery">
      {noneLabel && (
        <button
          type="button"
          className={`gallery-item gallery-item--none thumb--${thumbShape} ${
            selectedId === null ? 'is-selected' : ''
          }`}
          onClick={() => onSelect(null)}
        >
          <span>{noneLabel}</span>
        </button>
      )}

      {assets.map((asset) => (
        <button
          key={asset.id}
          type="button"
          className={`gallery-item thumb--${thumbShape} ${
            selectedId === asset.id ? 'is-selected' : ''
          }`}
          onClick={() => onSelect(asset.id)}
          title={asset.label}
        >
          <img src={asset.url} alt={asset.label} draggable={false} />
          <span className="gallery-item-label">
            {asset.label}
            {asset.imported && ' (importada)'}
          </span>
        </button>
      ))}

      <button
        type="button"
        className="gallery-import"
        onClick={() => fileInputRef.current?.click()}
      >
        + Importar imagem do computador
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={handleFileChosen}
      />
    </div>
  )
}
