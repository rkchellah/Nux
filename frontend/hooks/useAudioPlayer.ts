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

  const getCtx = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === 'closed') {
      ctxRef.current = new AudioContext({ sampleRate: 24000 })
      unlocked.current = false
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
      src.connect(ctx.destination)
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
