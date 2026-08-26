'use client'

import { RefObject } from 'react'

interface CameraViewProps {
  videoRef: RefObject<HTMLVideoElement | null>
  fit?: 'cover' | 'contain'
  mirrored?: boolean
  isActive?: boolean
  error?: string | null
}

export function CameraView({
  videoRef,
  fit = 'cover',
  mirrored = false,
  isActive = false,
  error = null,
}: CameraViewProps) {
  return (
    <div className="nux-camera">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`nux-camera-video nux-camera-video--${fit}${mirrored ? ' nux-camera-video--mirror' : ''}`}
        onLoadedMetadata={e => {
          const v = e.currentTarget
          if (v.paused) void v.play().catch(() => {})
        }}
      />
      {!isActive && !error ? (
        <div className="nux-camera-placeholder">
          <div className="nux-camera-placeholder-ring" aria-hidden="true" />
          <p>Starting camera…</p>
        </div>
      ) : null}
      {error ? (
        <div className="nux-camera-placeholder nux-camera-placeholder--error">
          <p>{error}</p>
        </div>
      ) : null}
      <div className="nux-camera-scanlines" aria-hidden="true" />
      <div className="nux-camera-vignette" aria-hidden="true" />
    </div>
  )
}
