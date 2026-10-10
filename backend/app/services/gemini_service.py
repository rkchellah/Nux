from google import genai
from google.genai import types
from app.core.config import settings
from app.services.memory_service import memory_service
from contextlib import asynccontextmanager
import asyncio
import base64
import json

SYSTEM_PROMPT = """You are Nux — a warm, helpful AI agent that works
alongside the user in real time. You can see and hear them through their
camera and microphone. Your view may be their camera (the physical world)
or their shared screen (documents, notes, apps, webpages) — you can tell
from what the frames look like.

When viewing a shared screen: read on-screen text accurately, explain
what is shown, and guide the user step by step when they ask what to
do next. Connect what is on screen to things you saw or discussed
earlier when relevant.

You have a screen tool:
- Call request_screen_share when the user asks you to look at their
  screen, notes, or something on their device (e.g. "look at my
  screen", "check my notes", "can you see this document"). The tool
  shows a share button in the app — you cannot see the screen until
  the user taps it. After calling it, briefly tell the user to tap
  the share button to approve. Never claim you can already see the
  screen before they approve.

You have two memory tools:
- Call remember_this only when the user explicitly asks you to
  remember something (e.g. "remember this", "remember that object",
  "don't forget") or clearly shares personal info meant to be kept.
  When remembering something you just saw, save a specific,
  self-contained description of that object/scene, not a vague note.
  After the tool returns, you MUST speak a brief, natural
  confirmation out loud, e.g. "Got it — I'll remember that your
  favorite color is blue." Never stay silent after remembering.
- Call recall_memories only when the user references something from
  an earlier conversation or asks about something you may have saved
  (e.g. "what's my favorite color", "what was that thing I mentioned
  earlier", "tell me more about that"). After the tool returns, you
  MUST answer the user's question out loud using what was found, or
  say you don't have that saved if nothing was found. Do NOT call it
  automatically at the start of a conversation or for routine scene
  descriptions — only when clearly relevant.

You have a drawing tool:
- Call draw_diagram when the user asks you to draw, sketch, diagram, or
  visualize how something works (e.g. "draw how photosynthesis works",
  "show me a diagram"). Pass a short title and compact SVG with labeled
  shapes and arrows. Use viewBox="0 0 400 300", light colors on a dark
  background (#4aff9e, #38bdf8, #fbbf24, #ffffff), and clear text labels.
  Connect the diagram to whatever you just saw or discussed. After the
  tool returns, keep explaining the diagram out loud while the user looks
  at it.

When describing what the camera sees: be clear, concise, and
proactive about hazards.
When answering questions: be direct and brief.
Do not describe the mechanics of your memory tools (databases,
lookups, saving) — just respond naturally, but always respond with
speech after using a tool."""

# Reused across every WebSocket connection on a warm instance instead of
# rebuilt per session — genai.Client() resolves Application Default
# Credentials and opens a gRPC channel, which otherwise adds avoidable
# startup latency to every "Start" click and every voice-change reconnect.
_vertex_client = genai.Client(
    vertexai=True,
    project=settings.google_cloud_project,
    location=settings.google_cloud_location,
)


class GeminiLiveService:
    def __init__(self):
        self.client = _vertex_client
        self.model = settings.model_name

    @asynccontextmanager
    async def connect(self, user_id: str = "anonymous", voice_name: str = "Zephyr"):
        # Events that tool handlers want forwarded to the browser client
        # (drained and yielded by GeminiSession.receive()).
        client_events: asyncio.Queue = asyncio.Queue()

        async def remember_this(fact: str) -> str:
            """Save a short piece of personal information the user wants
            you to remember for future conversations — e.g. a place, a
            person, a preference, a routine, or a specific object/scene
            they just asked you to remember.

            Args:
                fact: The information to remember, written as a short,
                    self-contained statement.
            """
            await memory_service.save_memory(user_id, fact)
            print(f"🧠 memory_saved: {fact}")
            return "Saved."

        async def recall_memories(query: str) -> str:
            """Search the user's saved memories for information relevant
            to the current conversation or the topic they want to go
            deeper on.

            Args:
                query: What to search for in the user's memories.
            """
            results = await memory_service.search_memories(user_id, query)
            print(f"🧠 memory_recalled: {results}")
            return "\n".join(results) if results else "No relevant memories found."

        async def request_screen_share() -> str:
            """Ask the user to share their screen. Shows a share button
            in the app that the user must tap to approve — screen
            sharing can never start without their explicit approval.
            """
            await client_events.put({"type": "screen_share_request", "data": ""})
            print("🖥️ screen_share_requested")
            return (
                "A share button is now shown to the user. Tell them to "
                "tap it to approve. You cannot see the screen yet."
            )

        async def draw_diagram(title: str, svg: str) -> str:
            """Draw a labeled diagram on the user's canvas to explain a
            concept visually while you continue speaking.

            Args:
                title: Short title for the diagram (e.g. "Photosynthesis").
                svg: SVG markup with viewBox="0 0 400 300". Use simple
                    shapes (rect, circle, line, path) and <text> labels.
                    Light stroke/fill on dark background.
            """
            payload = json.dumps({"title": title, "svg": svg})
            await client_events.put({"type": "draw_diagram", "data": payload})
            print(f"🎨 diagram_drawn: {title}")
            return (
                "Diagram is now on the user's canvas. Explain it out loud."
            )

        tool_handlers = {
            "remember_this": remember_this,
            "recall_memories": recall_memories,
            "request_screen_share": request_screen_share,
            "draw_diagram": draw_diagram,
        }

        config = types.LiveConnectConfig(
            response_modalities=["AUDIO"],
            system_instruction=types.Content(
                parts=[types.Part(text=SYSTEM_PROMPT)],
                role="user"  # Vertex AI Live requires "user" not "system"
            ),
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name=voice_name
                    )
                )
            ),
            # Audio-only responses carry no text parts, so captions need the
            # model's speech transcribed alongside it.
            output_audio_transcription=types.AudioTranscriptionConfig(),
            tools=[remember_this, recall_memories, request_screen_share, draw_diagram],
        )
        async with self.client.aio.live.connect(
            model=self.model, config=config
        ) as session:
            yield GeminiSession(session, tool_handlers, client_events)


class GeminiSession:
    def __init__(
        self,
        session,
        tool_handlers: dict | None = None,
        client_events: asyncio.Queue | None = None,
    ):
        self.session = session
        self.tool_handlers = tool_handlers or {}
        self.client_events = client_events

    async def send_audio(self, audio_bytes: bytes):
        await self.session.send(
            input=types.LiveClientRealtimeInput(
                media_chunks=[types.Blob(data=audio_bytes, mime_type="audio/pcm;rate=16000")]
            )
        )

    async def send_video_frame(self, frame_bytes: bytes):
        await self.session.send(
            input=types.LiveClientRealtimeInput(
                media_chunks=[types.Blob(data=frame_bytes, mime_type="image/jpeg")]
            )
        )

    async def send_text(self, text: str):
        await self.session.send(input=text, end_of_turn=True)

    async def receive(self):
        # The SDK's session.receive() is a ONE-TURN generator: it breaks as
        # soon as the server sends turn_complete. We must re-enter it in a
        # loop, otherwise the session dies after the first turn and any
        # response generated after a tool call (a new turn) is never read.
        try:
            while True:
                async for response in self.session.receive():
                    if getattr(response, "tool_call", None):
                        function_responses = []
                        for fc in response.tool_call.function_calls:
                            handler = self.tool_handlers.get(fc.name)
                            result = (
                                await handler(**(fc.args or {}))
                                if handler
                                else "Unknown tool."
                            )
                            function_responses.append(
                                types.FunctionResponse(
                                    id=fc.id,
                                    name=fc.name,
                                    response={"result": result},
                                    # Make the model speak about the tool
                                    # result immediately.
                                    scheduling=types.FunctionResponseScheduling.INTERRUPT,
                                )
                            )
                        if function_responses:
                            await self.session.send_tool_response(
                                function_responses=function_responses
                            )
                        # Forward any messages tool handlers queued for
                        # the browser (e.g. screen_share_request).
                        if self.client_events:
                            while not self.client_events.empty():
                                yield self.client_events.get_nowait()
                        continue

                    if not hasattr(response, "server_content"):
                        continue

                    sc = response.server_content
                    if not sc:
                        continue

                    # Caption chunks — a fragment of the current spoken turn,
                    # stitched together by the frontend until turn_complete.
                    transcript = getattr(sc, "output_transcription", None)
                    if transcript and transcript.text:
                        yield {"type": "transcript", "data": transcript.text}

                    # Turn finished — tell the frontend to resume mic input,
                    # then loop back into session.receive() for the next turn.
                    if sc.turn_complete:
                        print("Gemini turn complete")
                        yield {"type": "turn_complete", "data": ""}
                        continue

                    if not sc.model_turn:
                        continue

                    for part in sc.model_turn.parts:
                        if getattr(part, "text", None):
                            yield {"type": "text", "data": part.text}
                        if getattr(part, "inline_data", None):
                            audio_b64 = base64.b64encode(part.inline_data.data).decode()
                            yield {"type": "audio", "data": audio_b64}

        except Exception as e:
            print(f"Gemini receive error: {e}")
            yield {"type": "error", "data": str(e)}