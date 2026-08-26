'use client'

/** Strip the most common SVG injection vectors before rendering. */
function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/\bon\w+\s*=/gi, 'data-blocked=')
    .replace(/javascript:/gi, '')
}

function normalizeSvg(raw: string): string {
  const trimmed = raw.trim()
  if (trimmed.startsWith('<svg')) return trimmed
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300">${trimmed}</svg>`
}

export type DiagramData = {
  title: string
  svg: string
}

interface DiagramCanvasProps {
  diagram: DiagramData
  onClose: () => void
}

export function DiagramCanvas({ diagram, onClose }: DiagramCanvasProps) {
  const svgMarkup = sanitizeSvg(normalizeSvg(diagram.svg))

  return (
    <div className="sl-canvas-overlay">
      <div className="sl-canvas-border" />
      <div className="sl-canvas-header">
        <span className="sl-canvas-pill-dot" />
        <span className="sl-canvas-pill-label">Drawing</span>
        <h2 className="sl-canvas-title">{diagram.title}</h2>
      </div>
      <div
        className="sl-canvas-svg-wrap"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
      <button type="button" className="sl-canvas-close-btn" onClick={onClose}>
        Back to view
      </button>
    </div>
  )
}
