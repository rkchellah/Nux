'use client'

import { useRef, useCallback, useState } from 'react'

export function useAudioPlayer() {
  const ctxRef = useRef<AudioContext | null>(null)
  const queue = useRef<AudioBuffer[]>([])
  const playing = useRef(false)
  const activeSource = useRef<AudioBufferSourceNode | null>(null)
  const unlocked = useRef(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const isSpeakingRef = useRef(false)
  /**
   * Persistent boost + limiter chain (created once per context, reused by
   * every chunk). Gemini's native-audio voices are mastered quiet, and
   * mobile speakers + the OS "communication mode" audio route (triggered by
   * holding an open getUserMedia mic track) duck it further. A flat gain
   * multiply alone risks hard-clipping at destination on loud passages, so
   * we boost pre-limiter and let the compressor cap peaks instead of
   * clipping them.
   */
  const outputChainRef = useRef<{ gain: GainNode; limiter: DynamicsCompressorNode } | null>(null)
  /** Real <audio> element used to sidestep Android's mic-triggered volume ducking (see below). */
  const audioElRef = useRef<HTMLAudioElement | null>(null)

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      const ctx = new AudioContext({ sampleRate: 24000 })
      ctxRef.current = ctx
      unlocked.current = false

      const gain = ctx.createGain()
      gain.gain.value = 1.8
      const limiter = ctx.createDynamicsCompressor()
      limiter.threshold.value = -12
      limiter.knee.value = 6
      limiter.ratio.value = 16
      limiter.attack.value = 0.003
      limiter.release.value = 0.15
      gain.connect(limiter)
      outputChainRef.current = { gain, limiter }

      // Holding an open getUserMedia mic track pins Chrome's WebAudio output
      // unit to Android's quiet STREAM_VOICE_CALL route alongside the mic
      // (documented Chromium behavior, crbug 243506) — no gain node can undo
      // an OS-level route change. Real <audio>/<video> elements aren't pinned
      // to that route, so pipe the finished mix into one via a
      // MediaStreamDestination instead of connecting straight to
      // ctx.destination. Falls back to a direct connection if the element
      // route is blocked or unsupported, so playback never goes silent.
      try {
        const streamDest = ctx.createMediaStreamDestination()
        limiter.connect(streamDest)
        if (!audioElRef.current) audioElRef.current = new Audio()
        const audioEl = audioElRef.current
        audioEl.autoplay = true
        audioEl.srcObject = streamDest.stream
        audioEl.play().catch(() => {
          try {
            limiter.disconnect(streamDest)
          } catch { /* already disconnected */ }
          limiter.connect(ctx.destination)
        })
      } catch (e) {
        console.error('Audio element route unavailable, using direct connection:', e)
        limiter.connect(ctx.destination)
      }
    }
    return ctxRef.current
  }, [])

  /** Must run during a user gesture (e.g. after getUserMedia) or audio stays silent. */
  const unlockAudio = useCallback(async () => {
    try {
      const ctx = getCtx()
      if (ctx.state === 'suspended') {
        await ctx.resume()
      }
      if (!unlocked.current) {
        const buffer = ctx.createBuffer(1, 1, 24000)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(0)
        unlocked.current = true
      }
    } catch (e) {
      console.error('Audio unlock error:', e)
    }
  }, [getCtx])

  const playNext = useCallback(() => {
    if (queue.current.length === 0) {
      playing.current = false
      setTimeout(() => {
        isSpeakingRef.current = false
        setIsSpeaking(false)
      }, 400)
      return
    }
    playing.current = true
    isSpeakingRef.current = true
    setIsSpeaking(true)
    try {
      const ctx = getCtx()
      if (ctx.state === 'suspended') {
        void ctx.resume()
      }
      const buf = queue.current.shift()!
      const src = ctx.createBufferSource()
      src.buffer = buf
      src.connect(outputChainRef.current!.gain)
      activeSource.current = src
      src.onended = () => {
        activeSource.current = null
        playNext()
      }
      src.start(0)
    } catch (e) {
      console.error('Audio playback error:', e)
      playing.current = false
      isSpeakingRef.current = false
      setIsSpeaking(false)
    }
  }, [getCtx])

  const playAudio = useCallback((base64: string) => {
    try {
      const ctx = getCtx()
      if (ctx.state === 'suspended') {
        void ctx.resume()
      }
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const pcm16 = new Int16Array(
        bytes.buffer,
        bytes.byteOffset,
        Math.floor(bytes.byteLength / 2)
      )
      const float32 = new Float32Array(pcm16.length)
      for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768.0
      const buf = ctx.createBuffer(1, float32.length, 24000)
      buf.copyToChannel(float32, 0)
      queue.current.push(buf)
      if (!playing.current) playNext()
    } catch (e) {
      console.error('Audio decode error:', e)
    }
  }, [getCtx, playNext])

  return { playAudio, unlockAudio, isSpeaking, isSpeakingRef }
}
