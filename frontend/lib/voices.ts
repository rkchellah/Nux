export type NuxVoice = {
  id: string
  label: string
  tone: string
}

/** All Gemini Live prebuilt voices — streamed from Google Cloud, nothing to download. */
export const NUX_VOICES: NuxVoice[] = [
  { id: 'Zephyr', label: 'Zephyr', tone: 'Bright' },
  { id: 'Puck', label: 'Puck', tone: 'Upbeat' },
  { id: 'Charon', label: 'Charon', tone: 'Informative' },
  { id: 'Kore', label: 'Kore', tone: 'Firm' },
  { id: 'Fenrir', label: 'Fenrir', tone: 'Excitable' },
  { id: 'Leda', label: 'Leda', tone: 'Youthful' },
  { id: 'Orus', label: 'Orus', tone: 'Steady' },
  { id: 'Aoede', label: 'Aoede', tone: 'Breezy' },
  { id: 'Callirrhoe', label: 'Callirrhoe', tone: 'Easy-going' },
  { id: 'Autonoe', label: 'Autonoe', tone: 'Bright' },
  { id: 'Enceladus', label: 'Enceladus', tone: 'Breathy' },
  { id: 'Iapetus', label: 'Iapetus', tone: 'Clear' },
  { id: 'Umbriel', label: 'Umbriel', tone: 'Easy-going' },
  { id: 'Algieba', label: 'Algieba', tone: 'Smooth' },
  { id: 'Despina', label: 'Despina', tone: 'Smooth' },
  { id: 'Erinome', label: 'Erinome', tone: 'Clear' },
  { id: 'Algenib', label: 'Algenib', tone: 'Gravelly' },
  { id: 'Rasalgethi', label: 'Rasalgethi', tone: 'Informative' },
  { id: 'Alnilam', label: 'Alnilam', tone: 'Firm' },
  { id: 'Schedar', label: 'Schedar', tone: 'Even' },
  { id: 'Pulcherrima', label: 'Pulcherrima', tone: 'Forward' },
  { id: 'Achird', label: 'Achird', tone: 'Friendly' },
  { id: 'Gacrux', label: 'Gacrux', tone: 'Mature' },
  { id: 'Vindemiatrix', label: 'Vindemiatrix', tone: 'Gentle' },
  { id: 'Zubenelgenubi', label: 'Zubenelgenubi', tone: 'Casual' },
  { id: 'Sadachbia', label: 'Sadachbia', tone: 'Lively' },
  { id: 'Sadaltager', label: 'Sadaltager', tone: 'Knowledgeable' },
  { id: 'Sulafat', label: 'Sulafat', tone: 'Warm' },
  { id: 'Achernar', label: 'Achernar', tone: 'Soft' },
  { id: 'Laomedeia', label: 'Laomedeia', tone: 'Upbeat' },
]

export const DEFAULT_VOICE = 'Zephyr'

export function isValidVoice(name: string): boolean {
  return NUX_VOICES.some(v => v.id === name)
}

export function getVoiceById(id: string): NuxVoice | undefined {
  return NUX_VOICES.find(v => v.id === id)
}
