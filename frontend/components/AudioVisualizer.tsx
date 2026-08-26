'use client'

interface AudioVisualizerProps {
  isListening?: boolean
  isSpeaking?: boolean
}

/** Subtle bottom glow while session is active — no broken bar strip */
export function AudioVisualizer({ isListening = false, isSpeaking = false }: AudioVisualizerProps) {
  if (!isListening) return null

  return (
    <div
      className={`nux-audio-glow${isSpeaking ? ' nux-audio-glow--speaking' : ''}`}
      aria-hidden="true"
    />
  )
}
