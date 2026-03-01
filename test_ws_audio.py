#!/usr/bin/env python3
"""
Test: ElevenLabs audio via WebSocket + text via HTTP NDJSON.

1. Connect to ws://localhost:8080/npc-audio → get clientId
2. POST /npcs/:id/talk?voice=true  with { message, clientId }
3. HTTP response delivers text/tool/done events
4. WS delivers audio chunks in real-time

Usage:
  pip install websocket-client
  python3 test_ws_audio.py [npc_id] [message] [base_url]
"""
import sys, json, base64, threading, time, subprocess
import urllib.request
try:
    import websocket
except ImportError:
    print("Install websocket-client:  pip install websocket-client")
    sys.exit(1)

PLAYERS = [
    ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-f", "mp3", "pipe:0"],
    ["mpg123", "-q", "-"],
    ["play", "-q", "-t", "mp3", "-"],
]

def find_player():
    for cmd in PLAYERS:
        if subprocess.run(["which", cmd[0]], capture_output=True).returncode == 0:
            return cmd
    return None


def main():
    npc_id   = sys.argv[1] if len(sys.argv) > 1 else None
    message  = sys.argv[2] if len(sys.argv) > 2 else "Hello! Who are you?"
    base_url = sys.argv[3] if len(sys.argv) > 3 else "http://localhost:3001"
    ws_url   = base_url.replace("http://", "ws://").replace("https://", "wss://")
    ws_url   = f"{ws_url.rstrip('/').replace(':3001', ':8080')}/npc-audio"

    if not npc_id:
        with urllib.request.urlopen(f"{base_url}/npcs?perPage=1") as r:
            npc_id = json.load(r)["data"][0]["id"]
        print(f"[auto-selected NPC: {npc_id}]")

    player_cmd = find_player()
    if not player_cmd:
        print("⚠️  No audio player found (brew install ffmpeg). Skipping playback.", file=sys.stderr)

    print(f"Connecting to WS: {ws_url}")

    client_id_event = threading.Event()
    client_id = None
    audio_count = 0
    player_proc = None

    if player_cmd:
        player_proc = subprocess.Popen(
            player_cmd, stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )

    def on_message(ws_app, raw):
        nonlocal client_id, audio_count
        msg = json.loads(raw)
        if msg.get("event") == "connected":
            client_id = msg["clientId"]
            print(f"[WS] clientId = {client_id}")
            client_id_event.set()
        elif msg.get("type") == "audio":
            chunk = base64.b64decode(msg["content"])
            audio_count += 1
            print(f"🔊 audio chunk #{audio_count} ({len(chunk)} bytes)", flush=True)
            if player_proc:
                try:
                    player_proc.stdin.write(chunk)
                    player_proc.stdin.flush()
                except BrokenPipeError:
                    pass

    def on_error(ws_app, err):
        print(f"[WS ERROR] {err}")

    def on_close(ws_app, code, reason):
        print(f"[WS] closed  code={code}  reason={reason}")

    ws_app = websocket.WebSocketApp(
        ws_url,
        on_message=on_message,
        on_error=on_error,
        on_close=on_close,
    )
    ws_thread = threading.Thread(target=ws_app.run_forever, daemon=True)
    ws_thread.start()

    # Wait for the clientId
    if not client_id_event.wait(timeout=5):
        print("❌ Timed out waiting for clientId from WS")
        sys.exit(1)

    print(f"\n🎙  NPC: {npc_id}")
    print(f'💬  Message: "{message}"\n{"─"*60}')

    url     = f"{base_url}/npcs/{npc_id}/talk?voice=true"
    payload = json.dumps({"message": message, "clientId": client_id}).encode()
    req     = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"}, method="POST",
    )

    try:
        with urllib.request.urlopen(req) as resp:
            for raw_line in resp:
                line = raw_line.decode("utf-8").strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError:
                    continue
                t = obj.get("type")
                if t == "text":
                    print(obj["content"], end="", flush=True)
                elif t == "audio":
                    # fallback (no clientId used)
                    chunk = base64.b64decode(obj["content"])
                    print(f"\n[HTTP fallback audio] {len(chunk)} bytes", flush=True)
                elif t == "tool_call":
                    print(f"\n[tool_call] {obj.get('toolName')} {obj.get('parameters')}")
                elif t == "done":
                    print(f"\n\n✅ done  sessionId={obj.get('sessionId')}")
                elif t == "close":
                    print("\n[conversation closed]")
    except Exception as e:
        print(f"\n❌ HTTP error: {e}")

    # Give WS a moment to receive remaining audio
    time.sleep(2)
    ws_app.close()

    if player_proc:
        try:
            player_proc.stdin.close()
        except:
            pass
        player_proc.wait(timeout=10)

    print(f"\n[total audio chunks via WS: {audio_count}]")


if __name__ == "__main__":
    main()
