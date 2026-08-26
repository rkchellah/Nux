'use client'

import { useMemories } from '@/hooks/useMemories'
import {
  PanelCard,
  PanelCardList,
  PanelError,
  PanelMuted,
  PanelSection,
} from '@/components/PanelCard'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { VoicePicker } from '@/components/VoicePicker'

interface TrustPanelProps {
  open: boolean
  onClose: () => void
  showDesktopNote?: boolean
  voiceName?: string
  onVoiceChange?: (voiceId: string) => void
}

function formatMemoryDate(iso: string | null): string {
  if (!iso) return 'Saved recently'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return 'Saved recently'

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Saved today'
  if (diffDays === 1) return 'Saved yesterday'
  if (diffDays < 7) return `Saved ${diffDays} days ago`
  return `Saved ${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
}

export function TrustPanel({
  open,
  onClose,
  showDesktopNote,
  voiceName,
  onVoiceChange,
}: TrustPanelProps) {
  const { memories, loading, error, deleteOne, deleteAll } = useMemories(open)

  const handleForgetAll = async () => {
    if (!memories.length) return
    if (window.confirm('Delete everything it remembers? This cannot be undone.')) {
      await deleteAll()
    }
  }

  return (
    <Drawer
      open={open}
      onOpenChange={isOpen => {
        if (!isOpen) onClose()
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Trust & privacy</DrawerTitle>
          <DrawerClose className="panel-close">Close</DrawerClose>
        </DrawerHeader>

        <div className="panel-body panel-scroll">
          {voiceName && onVoiceChange ? (
            <PanelSection title="Nux voice">
              <PanelCard
                meta="Gemini Live · built-in"
                body="Every voice streams from Google's servers in real time. Nothing to download — tap a voice below to switch instantly."
              />
              <VoicePicker value={voiceName} onChange={onVoiceChange} />
            </PanelSection>
          ) : null}

          <PanelSection title="Our commitments">
            <PanelCardList>
              <PanelCard
                meta="Camera & screen · opt-in"
                body="Nothing is captured until you tap START or approve screen share."
              />
              <PanelCard
                meta="Memory · you control"
                body={'It saves distilled text only when you say "remember this." No raw video or audio is stored.'}
              />
              <PanelCard
                meta="Collaborative · not executive"
                body="It sees, remembers, and draws with you. It never acts on your behalf."
              />
              {showDesktopNote ? (
                <PanelCard
                  meta="Screen share · desktop"
                  body="Screen sharing is available on desktop browsers. Use the camera on mobile."
                />
              ) : null}
            </PanelCardList>
          </PanelSection>

          <PanelSection title="What it remembers">
            {loading ? <PanelMuted>Loading…</PanelMuted> : null}
            {error ? <PanelError>{error}</PanelError> : null}
            {!loading && !error && memories.length === 0 ? (
              <PanelMuted>Nothing saved yet. Say &ldquo;remember this&rdquo; during a session.</PanelMuted>
            ) : null}
            {!loading && memories.length > 0 ? (
              <PanelCardList>
                {memories.map(m => (
                  <PanelCard
                    key={m.id}
                    meta={formatMemoryDate(m.created_at)}
                    body={m.text}
                    action={{
                      label: 'Delete',
                      variant: 'text',
                      onClick: () => deleteOne(m.id),
                    }}
                    actionInline
                  />
                ))}
              </PanelCardList>
            ) : null}
          </PanelSection>
        </div>

        {memories.length > 0 ? (
          <DrawerFooter>
            <button type="button" className="panel-btn panel-btn--danger" onClick={handleForgetAll}>
              Forget everything
            </button>
          </DrawerFooter>
        ) : null}
      </DrawerContent>
    </Drawer>
  )
}
