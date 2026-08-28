# Bug log — what I learned building Nux

Problems that weren't in any tutorial. Kept here (not only in the README) so deploy docs stay short and the failure history stays searchable.

---

## Gemini hears itself if you don't mute the mic during playback

When Gemini speaks, its audio comes out of the browser speaker. The mic picks that up, sends it back to Gemini, and the session breaks — Gemini hears its own voice mid-sentence and goes silent permanently.

**Fix:** `isSpeakingRef` in `useAudioPlayer.ts` — a React ref, not state, because refs hold the live value synchronously. The `ScriptProcessorNode` checks `isSpeakingRef.current` on every audio frame; if Gemini is speaking, the frame is dropped before it ever reaches the WebSocket. When playback finishes (queue drain + short delay), `isSpeakingRef.current` is cleared and the mic reopens.

**Why a ref:** the audio processor callback captures a stale closure — state updates would not be visible inside it, but a ref always is.

**Note:** Earlier write-ups said `turn_complete` clears the ref. In the current frontend, mute is tied to the playback queue, not only to `turn_complete`.

---

## Gemini's voice sounds quiet even after the mobile "boost" gain

**Symptom:** Gemini's speech plays but is noticeably quieter than expected, especially on phones — not muted, just faint.

**Audit findings, ranked by contribution:**

1. **Flat gain instead of loudness maximization.** The old fix (`useAudioPlayer.ts`) multiplied every chunk by a fixed `1.35` gain with nothing downstream to catch peaks. Because Web Audio hard-clips (distorts, doesn't limit) at the destination when a sample exceeds ±1.0, the multiplier could only be nudged up a little before introducing clipping distortion — so quiet passages stayed quiet. `gemini-live-2.5-flash-native-audio` masters its voices with headroom (well under 0 dBFS) by design, so a small linear boost isn't enough.
2. **Mobile OS "communication mode" audio routing.** `useCamera.ts` keeps a `getUserMedia` audio track open (`echoCancellation`/`noiseSuppression`/`autoGainControl`) for the whole live session. Android and iOS both treat a page with an open mic capture as a voice-call use case and can route *all* page audio — including unrelated Web Audio API playback — through the quieter "communication"/earpiece channel instead of the normal loud media channel. This is an OS/browser-level behavior with no reliable JS override; it compounds with #1 rather than being fixable purely client-side.
3. **Voice choice.** Some prebuilt voices (`lib/voices.ts` — "Soft", "Breathy", "Gentle" tones) are inherently quieter than others ("Firm", "Excitable") — not a bug, but worth ruling out when comparing loudness across sessions.

**Fix (this pass):** Replaced the single `GainNode` in `useAudioPlayer.ts` with a persistent gain (`1.8`, created once per `AudioContext` instead of per chunk) feeding a `DynamicsCompressorNode` configured as a limiter (threshold `-12dB`, ratio `16:1`, fast attack) before `ctx.destination`. This boosts quiet passages harder while the limiter — not hard clipping — catches loud peaks, raising perceived loudness without new distortion.

**Residual risk / next experiment:** If it's still too quiet on a specific phone, the OS communication-mode routing (#2) is the remaining suspect and isn't controllable from the web page; validate by comparing loudness with the mic permission-block removed (`isActive=false`) — if that session is noticeably louder, it confirms OS-level ducking rather than app logic.

---

## WebSocket connections to Cloud Run die without a heartbeat

Cloud Run sits behind a Google-managed proxy with a ~60-second idle timeout. A long conversation with natural pauses — the user thinking, Gemini processing — can easily go quiet for more than a minute. The connection drops with no error, just silence.

**Fix (backend):** keepalive task in `backend/app/api/websocket.py` sends `ping` every ~20s; the server also answers client `ping` with `pong`.

**Gap (fixed):** the browser client now answers server `ping` with `pong` and sends its own `ping` every ~20s (`useWebSocket.ts`).

---

## The SDK's `receive()` stops listening after every turn — and tool calls exposed it

When memory tools were added, Gemini went completely mute after saving or recalling a memory. No spoken confirmation, ever. Logs showed `memory_saved` immediately followed by `turn_complete` with zero audio in between.

First fix (`scheduling=INTERRUPT` on the tool response) was necessary but not sufficient. The real cause was in the installed SDK: `session.receive()` is a **one-turn** generator — it breaks when `turn_complete` arrives. Calling it once per session meant the backend stopped listening and tore down the connection after every turn.

Normal turns looked fine because audio streamed before `turn_complete`. A tool call's spoken confirmation is a *new* turn — by then nobody was listening. The session was also silently destroyed and rebuilt every exchange: context lost, full setup cost each time, while the app still "worked" enough to hide it.

**Fix:** wrap `session.receive()` in `while True:` inside `GeminiSession.receive()` so after each turn the backend re-enters the generator on the **same** session.

---

## The live demo can look dead when the app is fine — Cloud Run won't serve without billing

From late July through 26 August 2026 the app URL returned Google's generic *Server Error / try again in 30 seconds*, then *Rate exceeded.* Both pages are misleading. `gcloud run services describe` still showed the service **Ready**.

Real log line: *The request failed because billing is disabled for this project.* Project `sightline-2026` had `billingEnabled: false`; linked billing accounts were **closed**.

After reopening billing, Cloud Run could start a healthy instance but the URL kept returning HTTP 429 for a while — documented Google behavior: after re-enabling billing, routing can take **up to ~30 minutes**, with 429/503 and *no available instance*. Refreshing during that window makes 429 last longer. App code was not the failure.

---

## Real-device camera test (medication labels)

Tested on a real device, not a simulator. Camera pointed at medications in hand. Gemini correctly identified them from the live feed and correctly declined specific dosage advice — the right call, but it showed the product needed better prompting so users ask safer questions. Feedback from actual use, not desk-only testing.

---

## Flip camera kills the session mic (mobile, also possible on desktop dual-cam)

**Symptom:** Front camera works (slow/faint historically); after flip, Gemini goes silent — "nothing."

**Cause:** Live mic capture in `page.tsx` bound once when the session started to the first `MediaStream`. `toggleCamera` stopped that stream and opened a new one, but `isSessionActive` stayed true so the audio effect never rebound. Video recovered; uplink audio stayed on a dead stream.

**Fix (2026-08):** `streamEpoch` + `isActive` in `useCamera` / `page.tsx` so ScriptProcessor remounts on every new stream. Also: silent `GainNode` (no mic monitoring into speakers), resample to 16 kHz, MIME `audio/pcm;rate=16000`, safer base64 encode, harder `facingMode` with fallback, softer resolution on coarse pointers.

---

## Deploy: invalid uvicorn `--ws` value

Cloud Run revision failed to listen on `PORT=8080` because the container exited immediately:

`Invalid value for '--ws': 'websockets-sansio' is not one of 'auto', 'none', 'websockets', 'wsproto'.`

Pinned uvicorn `0.30.0` does not support `websockets-sansio`.

**Fix:** `--ws websockets` in `backend/Dockerfile` and local README commands.

---

## Related product notes (not bugs, but easy to misread)

| Area | Status |
|------|--------|
| Memory | Wired end-to-end (tools + Firestore + Trust UI). Needs vector index in GCP (`firestore.indexes.json`). |
| Screen share | Wired on desktop; weak/unsupported on many phones. |
| Drawing | Implemented via `draw_diagram` → SVG canvas — not freehand. |
| Voices | Applied in Live `speech_config`; changing voice mid-session is deferred until the next session (no cold reconnect mid-call). |
| Leftover dual mic path | Removed — `useCamera` no longer owns ScriptProcessor; only `page.tsx` captures PCM. |
| Dead `StatusIndicator` | Removed — unused after live toolbar rewrite. |
