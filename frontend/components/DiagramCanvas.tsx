'use client'

/** Strip the most common SVG injection vectors before rendering. */
function sanitizeSvg(raw: string): string {
  return raw
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, '')
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
    <div className="nux-canvas" role="dialog" aria-label={`Diagram: ${diagram.title}`}>
      <div className="nux-canvas-border" />
      <div className="nux-canvas-header">
        <div className="nux-canvas-pill">
          <span className="nux-canvas-pill-dot" />
          <span className="nux-canvas-pill-label">Drawing</span>
        </div>
        <h2 className="nux-canvas-title">{diagram.title}</h2>
        <button type="button" className="nux-canvas-close" onClick={onClose}>
          Back to view
        </button>
      </div>
      <div
        className="nux-canvas-svg"
        dangerouslySetInnerHTML={{ __html: svgMarkup }}
      />
    </div>
  )
}
