'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { getUserId } from '@/lib/config'

export type WSMessage = {
  type: string
  data: string
}

/** Inbound message tagged with a monotonically increasing sequence number. */
export type ReceivedMessage = WSMessage & { seq: number }

const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL ??
  'wss://sightline-backend-59597652459.europe-west1.run.app/ws'

/** Keep Cloud Run proxy idle timeout (~60s) from killing quiet sessions. */
const CLIENT_PING_MS = 20_000

export function useWebSocket(voiceName: string) {
  const [isConnected, setIsConnected] = useState(false)
  const [messages, setMessages] = useState<ReceivedMessage[]>([])
  // The list is capped, so its length stops growing — consumers must track
  // progress by seq, not by array index.
  const seqRef = useRef(0)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const attemptsRef = useRef(0)
  const unmountedRef = useRef(false)
  const voiceRef = useRef(voiceName)
  voiceRef.current = voiceName
  /** Voice actually used on the open Live session (set on ws open). */
  const liveVoiceRef = useRef(voiceName)

  const clearPing = useCallback(() => {
    if (pingRef.current) {
      clearInterval(pingRef.current)
      pingRef.current = null
    }
  }, [])

  const startPing = useCallback((ws: WebSocket) => {
    clearPing()
    pingRef.current = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', data: '' }))
      }
    }, CLIENT_PING_MS)
  }, [clearPing])

  const connect = useCallback(() => {
    if (unmountedRef.current) return
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) return

    clearPing()
    setIsConnected(false)

    try {
      const userId = getUserId()
      const voice = encodeURIComponent(voiceRef.current)
      const ws = new WebSocket(
        `${WS_URL}?user_id=${encodeURIComponent(userId)}&voice=${voice}`,
      )
      wsRef.current = ws

      ws.onopen = () => {
        if (unmountedRef.current) return
        console.log('✅ WebSocket connected')
        liveVoiceRef.current = voiceRef.current
        setMessages([])
        setIsConnected(true)
        attemptsRef.current = 0
        startPing(ws)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSMessage
          // Application-level keepalive — answer server pings; ignore pongs.
          if (msg.type === 'ping') {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: 'pong', data: '' }))
            }
            return
          }
          if (msg.type === 'pong') return

          const received = { ...msg, seq: ++seqRef.current }
          setMessages(prev => [...prev.slice(-30), received])
        } catch (e) {
          console.error('Failed to parse message:', e)
        }
      }

      ws.onclose = (event) => {
        if (unmountedRef.current) return
        console.log(`WebSocket closed: ${event.code}`)
        clearPing()
        setIsConnected(false)
        wsRef.current = null

        const delay = Math.min(1000 * Math.pow(2, attemptsRef.current), 10000)
        attemptsRef.current++
        console.log(`Reconnecting in ${delay}ms (attempt ${attemptsRef.current})`)
        clearTimeout(reconnectRef.current ?? undefined)
        reconnectRef.current = setTimeout(connect, delay)
      }

      ws.onerror = (event) => {
        console.error('WebSocket error:', event)
      }
    } catch (err) {
      console.error('Failed to create WebSocket:', err)
    }
  }, [clearPing, startPing])

  const reconnect = useCallback(() => {
    clearTimeout(reconnectRef.current ?? undefined)
    clearPing()
    attemptsRef.current = 0
    if (wsRef.current) {
      wsRef.current.onclose = null
      wsRef.current.close()
      wsRef.current = null
    }
    setIsConnected(false)
    connect()
  }, [clearPing, connect])

  /**
   * Reconnect only if preferred voice differs from the Live session voice.
   * Used after a session ends or when changing voice on the landing page.
   */
  const syncVoiceSession = useCallback(() => {
    if (voiceRef.current === liveVoiceRef.current && isConnected) return
    reconnect()
  }, [isConnected, reconnect])

  useEffect(() => {
    unmountedRef.current = false
    connect()
    return () => {
      unmountedRef.current = true
      clearTimeout(reconnectRef.current ?? undefined)
      clearPing()
      wsRef.current?.close()
    }
  }, [connect, clearPing])

  const sendMessage = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg))
    } else {
      console.warn('WebSocket not connected, cannot send:', msg.type)
    }
  }, [])

  const sendAudio = useCallback((base64: string) => {
    sendMessage({ type: 'audio', data: base64 })
  }, [sendMessage])

  const sendFrame = useCallback((base64: string) => {
    sendMessage({ type: 'video_frame', data: base64 })
  }, [sendMessage])

  return {
    isConnected,
    messages,
    sendAudio,
    sendFrame,
    syncVoiceSession,
  }
}
