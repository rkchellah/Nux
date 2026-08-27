'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(pointer: coarse)').matches
}

/**
 * Camera + mic MediaStream only. Live-session PCM capture lives in page.tsx
 * so it can rebind on streamEpoch / flip.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null!)
  const streamRef = useRef<MediaStream | null>(null)
  const [isActive, setIsActive] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState<string | null>(null)
  /** Bumps whenever a new MediaStream is attached — page remounts mic capture. */
  const [streamEpoch, setStreamEpoch] = useState(0)
  const [canFlipCamera, setCanFlipCamera] = useState(false)

  const attachStream = useCallback((stream: MediaStream) => {
    const video = videoRef.current
    if (!video) return
    video.srcObject = stream
    video.muted = true
    void video.play().catch(() => {})
  }, [])

  useEffect(() => {
    if (!isActive || !streamRef.current) return
    attachStream(streamRef.current)
  }, [isActive, attachStream])

  const refreshCameraFlipSupport = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        setCanFlipCamera(false)
        return
      }
      const devices = await navigator.mediaDevices.enumerateDevices()
      const cams = devices.filter(d => d.kind === 'videoinput')
      setCanFlipCamera(cams.length > 1)
    } catch {
      setCanFlipCamera(false)
    }
  }, [])

  useEffect(() => {
    void refreshCameraFlipSupport()
    const md = navigator.mediaDevices
    if (!md?.addEventListener) return
    const onChange = () => { void refreshCameraFlipSupport() }
    md.addEventListener('devicechange', onChange)
    return () => md.removeEventListener('devicechange', onChange)
  }, [refreshCameraFlipSupport])

  useEffect(() => {
    if (isActive) void refreshCameraFlipSupport()
  }, [isActive, streamEpoch, refreshCameraFlipSupport])

  const openCameraStream = useCallback(async (mode: 'user' | 'environment') => {
    const mobile = isCoarsePointer()
    const videoBase = mobile
      ? { width: { ideal: 640 }, height: { ideal: 480 } }
      : { width: { ideal: 1280 }, height: { ideal: 720 } }
    const audio = {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    } as const

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { ...videoBase, facingMode: { exact: mode } },
        audio,
      })
    } catch {
      return await navigator.mediaDevices.getUserMedia({
        video: { ...videoBase, facingMode: { ideal: mode } },
        audio,
      })
    }
  }, [])

  const startCamera = useCallback(async (mode?: 'user' | 'environment') => {
    const selectedMode = mode || facingMode
    setError(null)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
      if (videoRef.current) videoRef.current.srcObject = null
      setIsActive(false)
      setIsListening(false)
    }
    try {
      const stream = await openCameraStream(selectedMode)
      streamRef.current = stream
      setFacingMode(selectedMode)
      setIsActive(true)
      setIsListening(true)
      setStreamEpoch(n => n + 1)
      attachStream(stream)
      void refreshCameraFlipSupport()
    } catch (err) {
      console.error('Camera error:', err)
      const message =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Camera access was denied. Allow camera in your browser settings.'
          : 'Could not start camera. Check permissions and try again.'
      setError(message)
      throw err
    }
  }, [facingMode, attachStream, openCameraStream, refreshCameraFlipSupport])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setIsActive(false)
    setIsListening(false)
    setError(null)
  }, [])

  const toggleCamera = useCallback(async () => {
    const newMode = facingMode === 'user' ? 'environment' : 'user'
    if (!isActive) {
      setFacingMode(newMode)
      return
    }
    stopCamera()
    await new Promise<void>(resolve => {
      window.setTimeout(resolve, 200)
    })
    await startCamera(newMode)
  }, [facingMode, isActive, stopCamera, startCamera])

  const captureFrame = useCallback((maxWidth: number = 640): string | null => {
    const video = videoRef.current
    if (!video || !isActive || video.readyState < 2) return null
    const vw = video.videoWidth || 640
    const vh = video.videoHeight || 480
    const scale = Math.min(1, maxWidth / vw)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(vw * scale)
    canvas.height = Math.round(vh * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.6).split(',')[1] ?? null
  }, [isActive])

  const getAudioStream = useCallback(() => streamRef.current, [])

  return {
    videoRef,
    isActive,
    isListening,
    facingMode,
    error,
    streamEpoch,
    canFlipCamera,
    startCamera,
    stopCamera,
    toggleCamera,
    captureFrame,
    getAudioStream,
  }
}
