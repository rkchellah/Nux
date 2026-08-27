/** Target rate for Gemini Live uplink. */
export const PCM_INPUT_RATE = 16000

/** Gemini Live native-audio downlink rate. */
export const PCM_OUTPUT_RATE = 24000

/**
 * Convert Float32 PCM to Int16, downsampling to 16 kHz when needed.
 * Many mobile browsers ignore AudioContext({ sampleRate: 16000 }).
 */
export function floatToPcm16At16k(
  input: Float32Array,
  inputSampleRate: number,
): Int16Array {
  const rate = inputSampleRate > 0 ? inputSampleRate : PCM_INPUT_RATE
  if (Math.abs(rate - PCM_INPUT_RATE) < 1) {
    const pcm16 = new Int16Array(input.length)
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i] ?? 0))
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
    }
    return pcm16
  }

  const ratio = rate / PCM_INPUT_RATE
  const outLength = Math.max(1, Math.floor(input.length / ratio))
  const pcm16 = new Int16Array(outLength)
  for (let i = 0; i < outLength; i++) {
    const idx = Math.min(input.length - 1, Math.floor(i * ratio))
    const s = Math.max(-1, Math.min(1, input[idx] ?? 0))
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff
  }
  return pcm16
}

/** Safe base64 encode — avoids spread of huge typed arrays on mobile. */
export function pcm16ToBase64(pcm16: Int16Array): string {
  const bytes = new Uint8Array(pcm16.buffer, pcm16.byteOffset, pcm16.byteLength)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!)
  }
  return btoa(binary)
}
