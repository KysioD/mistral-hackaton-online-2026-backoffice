#!/usr/bin/env python3
"""
Test script: talk to an NPC with voice=true and play audio in real time as chunks arrive.

Usage:
  python3 test_voice.py [npc_id] [message] [base_url]

Examples:
  python3 test_voice.py
  python3 test_voice.py 3533aaa2-356c-43ba-a497-0101abe56380
  python3 test_voice.py 3533aaa2-356c-43ba-a497-0101abe56380 "Tell me about yourself"
  python3 test_voice.py 3533aaa2-356c-43ba-a497-0101abe56380 "Hello" http://localhost:3001
"""

import sys
import json
import base64
import subprocess
import urllib.request

PLAYERS = [
    # ffplay (ffmpeg suite) — best stdin MP3 streaming support
    ["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", "-f", "mp3", "pipe:0"],
    # mpg123 — reads MP3 from stdin with -
    ["mpg123", "-q", "-"],
    # sox play via stdin — fallback
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

    if not npc_id:
        with urllib.request.urlopen(f"{base_url}/npcs?perPage=1") as r:
            npc_id = json.load(r)["data"][0]["id"]
        print(f"[auto-selected NPC: {npc_id}]")

    player_cmd = find_player()
    if not player_cmd:
        print("⚠️  No streaming audio player found. Install ffmpeg (brew install ffmpeg) or mpg123.", file=sys.stderr)
        sys.exit(1)

    url     = f"{base_url}/npcs/{npc_id}/talk?voice=true"
    payload = json.dumps({"message": message}).encode()
    req     = urllib.request.Request(
        url, data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    # Start the audio player immediately, reading MP3 from its stdin
    player_proc = subprocess.Popen(
        player_cmd,
        stdin=subprocess.PIPE,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )

    audio_count = 0

    print(f"\n🎙  Talking to NPC {npc_id}  [player: {player_cmd[0]}]")
    print(f'💬  Message: "{message}"\n')
    print("─" * 60)

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
                    chunk_bytes = base64.b64decode(obj["content"])
                    try:
                        player_proc.stdin.write(chunk_bytes)
                        player_proc.stdin.flush()
                        audio_count += 1
                        print("🔊", end="", flush=True)
                    except BrokenPipeError:
                        print("\n[player pipe closed early]", file=sys.stderr)

                elif t == "tool_call":
                    print(f"\n[tool: {obj.get('toolName')}({obj.get('parameters')})]", end="", flush=True)

                elif t == "close":
                    print("\n[conversation closed]", end="", flush=True)

                elif t == "done":
                    print("\n" + "─" * 60)
                    print(f"✅  Done  (session: {obj.get('sessionId', '?')}, {audio_count} audio chunks)")

                elif t == "error":
                    print(f"\n❌  Error: {obj.get('message')}", file=sys.stderr)
    finally:
        # Close stdin to signal EOF to the player and wait for it to finish
        try:
            player_proc.stdin.close()
        except Exception:
            pass
        player_proc.wait()

    if audio_count == 0:
        print("\n⚠️  No audio chunks received — check ?voice=true and ELEVENLABS_VOICE_ID is set.")


if __name__ == "__main__":
    main()

