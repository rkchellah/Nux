'use client'

import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { NUX_VOICES, getVoiceById } from '@/lib/voices'

interface VoicePanelProps {
  open: boolean
  onClose: () => void
  value: string
  onChange: (voiceId: string) => void
}

export function VoicePanel({ open, onClose, value, onChange }: VoicePanelProps) {
  const selected = getVoiceById(value)

  return (
    <Drawer
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Choose Nux&apos;s voice</DrawerTitle>
          <DrawerClose className="panel-close">Close</DrawerClose>
        </DrawerHeader>

        <div className="panel-body panel-scroll">
          <p className="nux-voice-note">
            All voices stream live from Gemini — nothing to download or install. Pick one and Nux
            reconnects with it right away.
          </p>

          {selected ? (
            <p className="nux-voice-current">
              Current: <strong>{selected.label}</strong> · {selected.tone}
            </p>
          ) : null}

          <div className="nux-voice-grid" role="listbox" aria-label="Nux voices">
            {NUX_VOICES.map(voice => {
              const isActive = voice.id === value
              return (
                <button
                  key={voice.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`nux-voice-option${isActive ? ' nux-voice-option--active' : ''}`}
                  onClick={() => {
                    onChange(voice.id)
                    onClose()
                  }}
                >
                  <span className="nux-voice-option-name">{voice.label}</span>
                  <span className="nux-voice-option-tone">{voice.tone}</span>
                </button>
              )
            })}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
