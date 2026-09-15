import type { JSX } from 'react'
import type { ImageAsset } from '../types'
import { AssetGallery } from './AssetGallery'

interface BackgroundPanelProps {
  backgrounds: ImageAsset[]
  selectedId: string | null
  onSelect: (id: string | null) => void
  onImport: (asset: ImageAsset) => void
}

/**
 * R1: painel de escolha do background da cena. O escritor monta o cenário
 * por seleção visual, como num editor de imagens — sem código.
 */
export function BackgroundPanel({
  backgrounds,
  selectedId,
  onSelect,
  onImport
}: BackgroundPanelProps): JSX.Element {
  return (
    <section className="panel">
      <h2 className="panel-title">Fundo da cena</h2>
      <p className="panel-hint">Clique numa imagem para aplicá-la ao palco.</p>
      <AssetGallery
        assets={backgrounds}
        selectedId={selectedId}
        onSelect={onSelect}
        onImport={onImport}
        thumbShape="landscape"
      />
    </section>
  )
}
