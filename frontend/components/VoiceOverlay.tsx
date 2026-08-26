'use client'

import { useEffect, useRef } from 'react'

interface VoiceOverlayProps {
  messages: string[]
}

export function VoiceOverlay({ messages }: VoiceOverlayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const displayMessages = messages.slice(-3)

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [messages])

  if (displayMessages.length === 0) return null

  return (
    <div className="nux-voice" role="status" aria-live="polite" aria-atomic="true">
      <div ref={containerRef} className="nux-voice-list">
        {displayMessages.map((message, i) => (
          <div key={`${i}-${message.slice(0, 24)}`} className="nux-voice-bubble animate-fade-in">
            <p>{message}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
