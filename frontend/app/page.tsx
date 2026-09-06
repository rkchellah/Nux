'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useCamera } from '@/hooks/useCamera'
import { useScreenShare } from '@/hooks/useScreenShare'
import { useWebSocket } from '@/hooks/useWebSocket'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { CameraView } from '@/components/CameraView'
import { AudioVisualizer } from '@/components/AudioVisualizer'
import { VoiceOverlay } from '@/components/VoiceOverlay'
import { VoicePicker } from '@/components/VoicePicker'
import { DiagramCanvas, type DiagramData } from '@/components/DiagramCanvas'
import { TrustPanel } from '@/components/TrustPanel'
import { HowToPanel } from '@/components/HowToPanel'
import { Landing } from '@/components/Landing'
import { getVoiceName, setVoiceName } from '@/lib/config'
import { DEFAULT_VOICE } from '@/lib/voices'
import { floatToPcm16At16k, pcm16ToBase64 } from '@/lib/pcm'

function IconStop() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="3" y="3" width="10" height="10" rx="1.5" />
    </svg>
  )
}

function IconFlip() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 5h5a2 2 0 0 1 2 2v4" strokeLinecap="round" />
      <path d="M14 11H9a2 2 0 0 1-2-2V5" strokeLinecap="round" />
      <path d="M12 3l2 2-2 2M4 13l-2-2 2-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="3" width="12" height="8" rx="1.5" />
      <path d="M5 14h6" strokeLinecap="round" />
    </svg>
  )
}

export default function Home() {
  // Server-render (and the client's first hydration pass) can't see
  // localStorage, so this must start as the same default on both sides —
  // reading getVoiceName() here directly caused a client/server text
  // mismatch (React error #418) that retriggered every render and hung
  // the tab, which is what made the app look permanently mute.
  const [voiceName, setVoiceNameState] = useState(DEFAULT_VOICE)
  const { videoRef, isActive, isListening, facingMode, error: cameraError, streamEpoch, canFlipCamera, startCamera, stopCamera, toggleCamera, captureFrame, getAudioStream } = useCamera()
  const { isSharing, isSupported: canShareScreen, startScreenShare, stopScreenShare } = useScreenShare()
  const { isConnected, sendAudio, sendFrame, messages, syncVoiceSession } = useWebSocket(voiceName)
  const { playAudio, unlockAudio, isSpeaking, isSpeakingRef } = useAudioPlayer()

  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [displayMessages, setDisplayMessages] = useState<string[]>([])
  const [sessionMode, setSessionMode] = useState('READY')
  const [videoSource, setVideoSource] = useState<'camera' | 'screen'>('camera')
  const [shareRequested, setShareRequested] = useState(false)
  const [canvasDiagram, setCanvasDiagram] = useState<DiagramData | null>(null)
  const [trustPanelOpen, setTrustPanelOpen] = useState(false)
  const [howToPanelOpen, setHowToPanelOpen] = useState(false)
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null)

  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const lastProcessedMsgRef = useRef(0)
  const playAudioRef = useRef(playAudio)
  playAudioRef.current = playAudio
  const isSessionActiveRef = useRef(false)
  isSessionActiveRef.current = isSessionActive

  const handleVoiceChange = (next: string) => {
    setVoiceName(next)
    setVoiceNameState(next)
    if (isSessionActiveRef.current) {
      setVoiceNotice('Voice saved — applies when you start the next session')
    } else {
      syncVoiceSession()
      setVoiceNotice('Voice updated')
    }
    window.setTimeout(() => setVoiceNotice(null), 3200)
  }

  // Pick up the real stored voice once we're safely past hydration.
  // No need to force a reconnect here — handleStart() already calls
  // syncVoiceSession() before every session, once the WS hook's voice
  // ref has caught up to this state update.
  useEffect(() => {
    const stored = getVoiceName()
    if (stored !== DEFAULT_VOICE) setVoiceNameState(stored)
  }, [])

  useEffect(() => {
    if (messages.length === 0) {
      lastProcessedMsgRef.current = 0
      return
    }
    if (messages.length <= lastProcessedMsgRef.current) return

    for (let i = lastProcessedMsgRef.current; i < messages.length; i++) {
      const msg = messages[i]
      if (msg.type === 'audio') {
        setIsProcessing(false)
        void playAudioRef.current(msg.data)
      }
      if (msg.type === 'text') setDisplayMessages(prev => [...prev, msg.data])
      if (msg.type === 'turn_complete') setIsProcessing(false)
      if (msg.type === 'screen_share_request') setShareRequested(true)
      if (msg.type === 'draw_diagram') {
        try {
          setCanvasDiagram(JSON.parse(msg.data) as DiagramData)
        } catch {
          console.error('Failed to parse diagram payload')
        }
      }
    }
    lastProcessedMsgRef.current = messages.length
  }, [messages])

  useEffect(() => {
    if (!isSessionActive) return
    if (isSpeaking) {
      setSessionMode('SPEAKING')
      setIsProcessing(false)
    } else {
      setSessionMode(isProcessing ? 'PROCESSING' : 'LISTENING')
    }
  }, [isSpeaking, isProcessing, isSessionActive])

  useEffect(() => {
    if (!isSessionActive || canvasDiagram) return
    frameIntervalRef.current = setInterval(() => {
      const frame = captureFrame(videoSource === 'screen' ? 1280 : 640)
      if (frame) sendFrame(frame)
    }, 1500)
    return () => { if (frameIntervalRef.current) clearInterval(frameIntervalRef.current) }
  }, [isSessionActive, captureFrame, sendFrame, videoSource, canvasDiagram])

  useEffect(() => {
    if (!isSessionActive || !isActive) return
    const audioStream = getAudioStream()
    if (!audioStream) return

    let isClosed = false
    const ctx = new AudioContext()
    audioContextRef.current = ctx
    const source = ctx.createMediaStreamSource(audioStream)
    const processor = ctx.createScriptProcessor(2048, 1, 1)
    processorRef.current = processor
    // Keep ScriptProcessor alive without monitoring mic into speakers
    // (monitoring fights mobile AEC and ducks Gemini playback).
    const silent = ctx.createGain()
    silent.gain.value = 0

    processor.onaudioprocess = (e) => {
      if (isClosed) return
      if (isSpeakingRef.current) return
      const input = e.inputBuffer.getChannelData(0)
      const pcm16 = floatToPcm16At16k(input, ctx.sampleRate)
      sendAudio(pcm16ToBase64(pcm16))

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = setTimeout(() => {
        if (!isSpeakingRef.current) setIsProcessing(true)
      }, 1200)
    }

    source.connect(processor)
    processor.connect(silent)
    silent.connect(ctx.destination)

    return () => {
      isClosed = true
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      try {
        processor.disconnect()
        silent.disconnect()
        source.disconnect()
        if (ctx.state !== 'closed') void ctx.close()
      } catch { /* ignore teardown races */ }
    }
  }, [isSessionActive, isActive, streamEpoch, getAudioStream, sendAudio, isSpeakingRef])

  const handleStart = async () => {
    await unlockAudio()
    // Apply any voice chosen while idle before opening the live camera session.
    syncVoiceSession()
    try {
      await startCamera()
    } catch {
      return
    }
    setIsSessionActive(true)
    setIsProcessing(false)
    setSessionMode('LISTENING')
    setDisplayMessages([])
  }

  const revertToCamera = useCallback(() => {
    setVideoSource('camera')
    const cam = getAudioStream()
    if (videoRef.current && cam) videoRef.current.srcObject = cam
  }, [getAudioStream, videoRef])

  const handleShareScreen = async () => {
    if (!canShareScreen) {
      window.alert('Screen share isn’t available in this browser. Try Chrome or Edge on desktop.')
      return
    }
    const stream = await startScreenShare(revertToCamera)
    if (!stream) return
    setShareRequested(false)
    setVideoSource('screen')
    if (videoRef.current) videoRef.current.srcObject = stream
  }

  const handleStopShare = () => {
    stopScreenShare()
    revertToCamera()
  }

  const handleStop = () => {
    setIsSessionActive(false)
    setIsProcessing(false)
    setSessionMode('READY')
    setDisplayMessages([])
    setShareRequested(false)
    stopScreenShare()
    setVideoSource('camera')
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
    if (processorRef.current) processorRef.current.disconnect()
    if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close()
    stopCamera()
    // Rebuild Live session if voice was changed mid-call (deferred apply).
    syncVoiceSession()
  }

  useEffect(() => {
    document.body.style.overflow = isSessionActive ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [isSessionActive])

  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current)
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current)
      if (processorRef.current) processorRef.current.disconnect()
      if (audioContextRef.current?.state !== 'closed') audioContextRef.current?.close()
    }
  }, [])

  const statusColor = isSpeaking
    ? '#38bdf8'
    : isProcessing
      ? '#facc15'
      : isConnected
        ? '#4aff9e'
        : '#facc15'

  const statusLabel = isSessionActive
    ? (canvasDiagram ? 'Drawing' : sessionMode.charAt(0) + sessionMode.slice(1).toLowerCase())
    : isConnected ? 'Ready' : 'Connecting…'

  return (
    <>
      {!isSessionActive && (
        <Landing
          ready={isConnected}
          voiceName={voiceName}
          onVoiceChange={handleVoiceChange}
          onStart={() => { void handleStart() }}
          onHowTo={() => setHowToPanelOpen(true)}
          onTrust={() => setTrustPanelOpen(true)}
        />
      )}

      {isSessionActive && (
        <main className="nux-live">
          <div className="nux-live-top-zone" aria-label="Session status area">
            <header className="nux-live-top">
              <div className="nux-live-status">
                <div className="nux-dot-wrap">
                  <div className="nux-dot" style={{ backgroundColor: statusColor }} />
                  {isProcessing ? (
                    <div className="nux-dot-processing" style={{ backgroundColor: statusColor }} />
                  ) : (
                    <div className="nux-dot-ripple" style={{ backgroundColor: statusColor }} />
                  )}
                </div>
                <span className="nux-live-label" style={{ color: statusColor }}>
                  {statusLabel}
                </span>
                <span className="nux-live-divider" aria-hidden="true" />
                <button type="button" className="nux-chip" onClick={() => setHowToPanelOpen(true)}>
                  Guide
                </button>
                <button type="button" className="nux-chip" onClick={() => setTrustPanelOpen(true)}>
                  Trust
                </button>
                <VoicePicker value={voiceName} onChange={handleVoiceChange} compact />
              </div>

              <div className={`nux-live-badge${isSpeaking ? ' nux-live-badge--active' : ''}`}>
                <div className="nux-live-badge-dot" />
                <span className="nux-live-badge-label">Live</span>
              </div>
            </header>
          </div>

          {voiceNotice ? (
            <div className="nux-toast" role="status">
              {voiceNotice}
            </div>
          ) : null}

          {!canvasDiagram && (
            <CameraView
              videoRef={videoRef}
              fit={videoSource === 'screen' ? 'contain' : 'cover'}
              mirrored={videoSource === 'camera' && facingMode === 'user'}
              isActive={isActive}
              error={cameraError}
            />
          )}
          {canvasDiagram && (
            <DiagramCanvas diagram={canvasDiagram} onClose={() => setCanvasDiagram(null)} />
          )}

          <AudioVisualizer isListening={isListening} isSpeaking={isSpeaking} />
          <VoiceOverlay messages={displayMessages} />

          {isSpeaking && (
            <>
              <div className="nux-speak-border" />
              <div className="nux-waveform" aria-hidden="true">
                {[...Array(7)].map((_, i) => (
                  <div
                    key={i}
                    className="nux-bar"
                    style={{
                      animation: `barDance ${0.4 + i * 0.07}s ease-in-out infinite`,
                      animationDelay: `${i * 0.08}s`,
                    }}
                  />
                ))}
              </div>
            </>
          )}

          {isSharing && (
            <>
              <div className="nux-share-border" />
              <div className="nux-share-pill">
                <div className="nux-share-pill-dot" />
                <span className="nux-share-pill-label">Screen shared</span>
              </div>
            </>
          )}

          {shareRequested && !isSharing && (
            <div className="nux-share-request">
              <div className="nux-share-card">
                <h2>Screen share request</h2>
                <p>Nux is asking to see your screen. Nothing is shared until you approve.</p>
                <button
                  type="button"
                  className="nux-btn nux-btn-primary"
                  onClick={() => { void handleShareScreen() }}
                >
                  Approve &amp; share
                </button>
                <button type="button" className="nux-chip nux-chip--light" onClick={() => setShareRequested(false)}>
                  Not now
                </button>
              </div>
            </div>
          )}

          <div className="nux-toolbar-zone" aria-label="Session controls area">
            <div className="nux-toolbar" role="toolbar" aria-label="Session controls">
              <button type="button" className="nux-tool nux-tool--stop" onClick={handleStop} aria-label="Stop session">
                <IconStop />
                <span className="nux-tool-tip">Stop</span>
              </button>
              {!isSharing && canFlipCamera && (
                <button
                  type="button"
                  className="nux-tool"
                  onClick={() => { void toggleCamera() }}
                  aria-label={facingMode === 'environment' ? 'Switch to front camera' : 'Switch to back camera'}
                >
                  <IconFlip />
                  <span className="nux-tool-tip">
                    {facingMode === 'environment' ? 'Front cam' : 'Back cam'}
                  </span>
                </button>
              )}
              {isSharing ? (
                <button type="button" className="nux-tool nux-tool--share" onClick={handleStopShare} aria-label="Stop sharing">
                  <IconShare />
                  <span className="nux-tool-tip">Stop share</span>
                </button>
              ) : (
                <button type="button" className="nux-tool nux-tool--share" onClick={() => void handleShareScreen()} aria-label="Share screen">
                  <IconShare />
                  <span className="nux-tool-tip">Share screen</span>
                </button>
              )}
            </div>
          </div>
        </main>
      )}

      <HowToPanel
        open={howToPanelOpen}
        onClose={() => setHowToPanelOpen(false)}
        showDesktopNote={!canShareScreen}
      />
      <TrustPanel
        open={trustPanelOpen}
        onClose={() => setTrustPanelOpen(false)}
        showDesktopNote={!canShareScreen}
        voiceName={voiceName}
        onVoiceChange={handleVoiceChange}
      />
    </>
  )
}
