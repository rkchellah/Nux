'use client'

import { useState } from 'react'
import { NuxPortrait } from '@/components/NuxPortrait'
import { VoicePicker } from '@/components/VoicePicker'
import { getVoiceById } from '@/lib/voices'

interface LandingProps {
  ready: boolean
  voiceName: string
  onVoiceChange: (voiceId: string) => void
  onStart: () => void
  onHowTo: () => void
  onTrust: () => void
}

const WHY = [
  {
    title: 'Sees what you show it',
    body: 'Point the camera at the world around you. Nux looks with you and talks it through in real time.',
  },
  {
    title: 'Shares your screen - when you say so',
    body: 'Walk through notes, code, or an app together. Nothing is shared until you tap approve.',
  },
  {
    title: 'Remembers on purpose',
    body: 'Say “remember this” and Nux keeps a short text note. You can review or delete anything in Trust.',
  },
  {
    title: 'Draws when you need to go deeper',
    body: 'Ask it to sketch how something works. A labeled diagram opens on the canvas, then you go back to the live view.',
  },
  {
    title: 'Collaborative, not executive',
    body: 'Nux works with you - sees, remembers, draws. It never acts on your behalf.',
  },
  {
    title: 'One live session',
    body: 'Camera, voice, screen, and memory stay in a single conversation. No chatbot tabs to juggle.',
  },
]

export function Landing({ ready, voiceName, onVoiceChange, onStart, onHowTo, onTrust }: LandingProps) {
  const [voiceOpen, setVoiceOpen] = useState(false)
  const selectedVoice = getVoiceById(voiceName)

  return (
    <div className="nux-landing">
      <header className="nux-nav">
        <div className="nux-nav-inner">
          <a href="#top" className="nux-logo">
            Nux
          </a>
          <nav className="nux-nav-links" aria-label="Page">
            <a href="#top">Home</a>
            <a href="#why">Why Nux</a>
            <button type="button" onClick={onHowTo}>
              How to
            </button>
            <button type="button" onClick={onTrust}>
              Trust
            </button>
          </nav>
        </div>
      </header>

      <section id="top" className="nux-hero">
        <div className="nux-hero-copy">
          <h1 className="nux-headline">Meet Nux</h1>
          <p className="nux-lead">
            Hey there! I&apos;m Nux, your collaborative agent. Point your camera, share your screen when
            you choose, and speak naturally. I see what you show me, remember what you ask me to, and
            draw when you need to go deeper. Let&apos;s work together — with you.
          </p>
          <div className="nux-cta-row">
            <button
              type="button"
              className={`nux-btn nux-btn-primary nux-btn-talk${ready ? '' : ' is-connecting'}`}
              onClick={onStart}
              disabled={!ready}
            >
              {!ready ? <span className="nux-btn-spinner" aria-hidden="true" /> : null}
              {ready ? 'Talk to Nux' : 'Connecting…'}
            </button>
            <button type="button" className="nux-btn nux-btn-secondary" onClick={() => setVoiceOpen(true)}>
              Voices
            </button>
          </div>
          <p className="nux-hint">
            {selectedVoice
              ? `Speaking as ${selectedVoice.label} · camera and mic required`
              : 'Camera and microphone access are required to begin'}
          </p>
          <VoicePicker
            value={voiceName}
            onChange={onVoiceChange}
            open={voiceOpen}
            onOpenChange={setVoiceOpen}
            showTrigger={false}
          />
        </div>
        <NuxPortrait />
      </section>

      <section id="why" className="nux-why">
        <h2 className="nux-section-title">Why you&apos;ll love Nux</h2>
        <div className="nux-why-grid">
          {WHY.map(item => (
            <article key={item.title} className="nux-why-card">
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nux-faq" id="faq">
        <h2 className="nux-section-title">
          Got questions?
          <span> I&apos;ve got answers.</span>
        </h2>
        <dl className="nux-faq-list">
          <div>
            <dt>Who is Nux?</dt>
            <dd>
              Nux is a real-time collaborative agent. It sees what you show it - the world through
              your camera, your work through the screen - remembers what matters, and draws with you.
            </dd>
          </div>
          <div>
            <dt>How do I start?</dt>
            <dd>
              Tap Talk to Nux and allow camera and microphone access. Then point, speak, and go.
            </dd>
          </div>
          <div>
            <dt>Does it act on my computer?</dt>
            <dd>
              No. Nux is collaborative, not executive. It never fills forms, clicks, or browses for
              you.
            </dd>
          </div>
          <div>
            <dt>Is my video stored?</dt>
            <dd>
              No. Memories are short text notes you asked it to keep. Raw video and audio are not
              saved. Review or delete them anytime in Trust.
            </dd>
          </div>
        </dl>
      </section>

      <footer className="nux-footer">Works with you</footer>
    </div>
  )
}
