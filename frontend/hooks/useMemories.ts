'use client'

import { useCallback, useEffect, useState } from 'react'
import { API_BASE, getUserId } from '@/lib/config'

export type MemoryItem = {
  id: string
  text: string
  created_at: string | null
}

export function useMemories(open: boolean) {
  const [memories, setMemories] = useState<MemoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMemories = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const userId = getUserId()
      const res = await fetch(
        `${API_BASE}/memories?user_id=${encodeURIComponent(userId)}`
      )
      if (!res.ok) throw new Error('Could not load memories')
      const data = await res.json()
      setMemories(data.memories ?? [])
    } catch {
      setError('Could not load memories. Try again later.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (open) fetchMemories()
  }, [open, fetchMemories])

  const deleteOne = useCallback(async (id: string) => {
    const userId = getUserId()
    const res = await fetch(
      `${API_BASE}/memories/${id}?user_id=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    )
    if (res.ok) setMemories(prev => prev.filter(m => m.id !== id))
  }, [])

  const deleteAll = useCallback(async () => {
    const userId = getUserId()
    const res = await fetch(
      `${API_BASE}/memories?user_id=${encodeURIComponent(userId)}`,
      { method: 'DELETE' }
    )
    if (res.ok) setMemories([])
  }, [])

  return { memories, loading, error, fetchMemories, deleteOne, deleteAll }
}
