import { DEFAULT_VOICE, isValidVoice } from './voices'

const USER_ID_KEY = 'parallel_user_id'
const LEGACY_USER_ID_KEY = 'sightline_user_id'
const VOICE_KEY = 'nux_voice'

export function getUserId(): string {
  if (typeof window === 'undefined') return 'anonymous'
  let id = window.localStorage.getItem(USER_ID_KEY)
  if (!id) {
    id = window.localStorage.getItem(LEGACY_USER_ID_KEY)
    if (id) window.localStorage.setItem(USER_ID_KEY, id)
  }
  if (!id) {
    id = crypto.randomUUID()
    window.localStorage.setItem(USER_ID_KEY, id)
  }
  return id
}

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://sightline-backend-59597652459.europe-west1.run.app'

export function getVoiceName(): string {
  if (typeof window === 'undefined') return DEFAULT_VOICE
  const stored = window.localStorage.getItem(VOICE_KEY)
  if (stored && isValidVoice(stored)) return stored
  return DEFAULT_VOICE
}

export function setVoiceName(name: string): void {
  if (typeof window === 'undefined') return
  if (!isValidVoice(name)) return
  window.localStorage.setItem(VOICE_KEY, name)
}
