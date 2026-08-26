'use client'

import { useState } from 'react'
import { getVoiceById } from '@/lib/voices'
import { VoicePanel } from '@/components/VoicePanel'

interface VoicePickerProps {
  value: string
  onChange: (voiceId: string) => void
  compact?: boolean
  className?: string
  open?: boolean
  onOpenChange?: (open: boolean) => void
  showTrigger?: boolean
}

export function VoicePicker({
  value,
  onChange,
  compact = false,
  className = '',
  open: openProp,
  onOpenChange,
  showTrigger = true,
}: VoicePickerProps) {
  const [openInternal, setOpenInternal] = useState(false)
  const open = openProp ?? openInternal
  const setOpen = onOpenChange ?? setOpenInternal
  const selected = getVoiceById(value)

  return (
    <>
      {showTrigger ? (
        <div className={`nux-voice-picker${compact ? ' nux-voice-picker--compact' : ''} ${className}`.trim()}>
          {!compact ? <span className="nux-voice-picker-label">Voice</span> : null}
          <button
            type="button"
            className="nux-voice-trigger"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
          >
            <span>{selected?.label ?? 'Zephyr'}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" aria-hidden="true">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
          </button>
          {!compact ? (
            <span className="nux-voice-picker-hint">
              {selected?.tone ?? 'Bright'} tone · instant switch, no download
            </span>
          ) : null}
        </div>
      ) : null}

      <VoicePanel
        open={open}
        onClose={() => setOpen(false)}
        value={value}
        onChange={onChange}
      />
    </>
  )
}
