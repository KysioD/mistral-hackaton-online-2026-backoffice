# Mistral Hackathon Online 2026 - Backoffice

This project is the backoffice platform built for the **Mistral Hackathon Online 2026**. It powers a set of AI-driven NPCs (Non-Player Characters) for a fantasy RPG game, where players can hold real-time voice conversations with characters such as a travelling merchant, an innkeeper, an apothecary, and a ghost.

The platform has two parts:

- **Backoffice UI** — a web interface to create and configure NPCs, assign them tools and system prompts, manage conversation examples used as retrieval context, and tune application settings.
- **Real-time gateway** — a WebSocket server that handles live in-game voice interactions: player audio is transcribed by **Voxtral**, the transcript is processed by a **Mistral** LLM with tool-calling, and the response is synthesised back to speech by **ElevenLabs TTS**.

Each NPC is defined by:
- A character prompt describing their personality, backstory, and role
- A set of game tools they can invoke (e.g. `sell_item`, `give_drink`, `steal_coin`)
- A voice ID for speech synthesis
- A library of curated conversation examples (in French and English) used as RAG context

The dataset ships with 4 pre-configured NPCs and 200 conversation examples (25 FR + 25 EN per character).

## Quick Start

**Requirements:** Docker (or Podman) and an `.env` file at the project root.

```bash
# 1. Clone the repo
git clone <repo-url>
cd mistral-hackaton-online-2026-backoffice

# 2. Create your .env (see Environment Variables section for all options)
cp .env.example .env   # then fill in your API keys

# 3. Build and start everything
docker compose up -d --build
# or
podman compose up -d --build
```

That's it. The backend will automatically run migrations and seed the database on first start.

| Service | URL |
|---------|-----|
| Backoffice UI | http://localhost:3000 |
| REST API | http://localhost:3001 |
| Swagger docs | http://localhost:3001/api/docs |
| WebSocket gateway | ws://localhost:8076 |

## Architecture

```mermaid
graph TD
    subgraph Client["Client (browser / game engine)"]
        B[Browser UI]
        G[Game Engine]
    end

    subgraph Docker["Docker Network"]
        FE["Frontend\nNext.js :3000"]
        BE["Backend (NestJS)\nREST API :3000\nSwagger /api/docs\nWS Gateway :8080"]
        DB[("PostgreSQL + pgvector\n:5432")]
    end

    subgraph External["External APIs"]
        Mistral["Mistral AI\n(LLM + Voxtral transcription)"]
        ElevenLabs["ElevenLabs\n(TTS synthesis)"]
    end

    B -- HTTP --> FE
    FE -- REST :3001 --> BE
    G -- WebSocket :8076 --> BE
    BE -- Prisma --> DB
    BE -- Mistral API --> Mistral
    BE -- ElevenLabs API --> ElevenLabs
```

**Stack:**
- **Backend**: NestJS · Prisma ORM · PostgreSQL (pgvector) · Mistral AI · ElevenLabs TTS · Voxtral real-time transcription
- **Frontend**: Next.js 14 · Tailwind CSS · Radix UI (shadcn/ui) · TanStack Query · Zod

## Port Mapping

| Service | Host port | Container port | Description |
|---------|-----------|----------------|-------------|
| Frontend | `3000` | `3000` | Next.js backoffice UI |
| Backend HTTP | `3001` | `3000` | REST API + Swagger |
| Backend WebSocket | `8076` | `8080` | Real-time NPC gateway |
| PostgreSQL | `5432` | `5432` | Database (pgvector) |

## Environment Variables

Copy `.env.example` to `.env` (or create `.env`) and fill in the required values:

```env
# Mistral AI — required
MISTRAL_API_KEY=your_mistral_api_key
LLM_MODEL=ministral-8b-latest          # default

# Voxtral real-time transcription — required for voice
VOXTRAL_MODEL=voxtral-mini-transcribe-realtime-2602   # default

# ElevenLabs TTS — optional (voice synthesis)
ELEVENLABS_API_KEY=your_elevenlabs_api_key
ELEVENLABS_VOICE_ID=your_voice_id   # see note below

# Database (overridden automatically when using Docker)
DATABASE_URL=postgresql://prisma:password@localhost:5432/mistral_backoffice_db?schema=public
```

## Production — Docker / Podman

Spins up the full stack (database, backend, frontend) in containers. The backend automatically runs migrations and seeds the database on first start.

```bash
# First run — build images then start
docker compose up -d --build

# Subsequent starts (no rebuild needed)
docker compose up -d
```

> **Podman users:** replace `docker compose` with `podman compose` throughout.

Services will be available at:
- Backoffice UI → http://localhost:3000
- REST API → http://localhost:3001
- Swagger docs → http://localhost:3001/api/docs
- WebSocket gateway → ws://localhost:8076

## Development — Local

### Prerequisites

- Node.js v18+
- A running PostgreSQL instance with the `pgvector` extension

Start the database container only:

```bash
docker compose -f docker-compose.db.yml up -d
# or
podman compose -f docker-compose.db.yml up -d
```

### 1. Backend

```bash
cd backend
npm install

# Apply migrations and seed (first time only)
npx prisma migrate deploy
npx prisma db seed

# Start in watch mode
npm run start:dev
```

The API runs at http://localhost:3000, Swagger at http://localhost:3000/api/docs.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI runs at http://localhost:3000.

> Set `NEXT_PUBLIC_API_URL=http://localhost:3000` in your local environment (backend default dev port).

## Database

The project uses **PostgreSQL 17** with the `pgvector` extension for vector similarity search. The schema is managed by Prisma and includes the following models:

| Model | Description |
|-------|-------------|
| `Npc` | NPC characters with spawn coordinates, character prompt, and voice ID |
| `Tool` | Game tools with parameters, shared across NPCs via `NpcTool` join |
| `SystemPrompt` | Versioned system prompts (one active at a time) |
| `Setting` | Key/value application settings |
| `Session` | Conversation sessions linked to an NPC |
| `ConversationExample` | Fine-tuning / RAG examples per NPC |

## Real-time Voice Gateway

The backend exposes a WebSocket server on port **8080** (host: `8076`) for live NPC conversations. Audio is streamed to/from the gateway, transcribed via **Voxtral**, processed by the Mistral LLM with tool-calling, and synthesised back with **ElevenLabs TTS**.

### ElevenLabs Voice ID

The `ELEVENLABS_VOICE_ID` must correspond to a voice that is present in **your** ElevenLabs library. Voices from the ElevenLabs public voice library are not accessible via API unless you have explicitly added them to *My Voices* first:

1. Go to [elevenlabs.io/voice-library](https://elevenlabs.io/voice-library)
2. Find the voice you want to use
3. Click **Add to My Voices**
4. Copy the voice ID from the voice settings page and paste it into `ELEVENLABS_VOICE_ID`

Voice IDs set on individual NPCs (via the backoffice UI) follow the same rule — each voice must be added to your account before it can be used.

### Testing

Test the voice pipeline with the included script:

```bash
python3 test_voice.py <npc-id> "Hello, tell me about yourself"
python3 test_ws_audio.py   # raw WebSocket audio test
```

## Dataset — NPC Tool Sets

The training dataset (`dataset/`) contains 200 conversation files (25 FR + 25 EN per NPC) across 4 characters. Each NPC has its own set of tools that reflect its role in the game world. Tools with the same name across NPCs (e.g. `list_info`, `sell_info`) are intentional — each NPC registers its own implementation.

### MaoMao (`dataset/mao_mao/` — 50 files)

Apothecary. Sells medicine and examines players.

| Tool | Arguments |
|------|-----------|
| `inspect_player` | — |
| `list_medicine` | — |
| `sell_medicine` | `name` (string), `price` (number) |
| `give_medicine` | `name` (string) |
| `close_conversation` | — |

### Edgar de Cormeil (`dataset/edgar/` — 50 files)

Innkeeper. Sells drinks and local information.

| Tool | Arguments |
|------|-----------|
| `list_drinks` | — |
| `sell_drink` | `name` (string), `price` (number) |
| `give_drink` | `name` (string) |
| `list_info` | — |
| `sell_info` | `price` (number) |

### Célestin de Cormeil (`dataset/celestin/` — 50 files)

Travelling merchant. Buys and sells items, appraises goods.

| Tool | Arguments |
|------|-----------|
| `list_items` | — |
| `show_item` | `name` (string) |
| `inspect_item` | `name` (string) |
| `sell_item` | `name` (string), `price` (number) |
| `buy_item` | `name` (string), `price` (number) |
| `give_item` | `name` (string) |
| `list_player_items` | — |
| `list_info` | — |
| `sell_info` | `price` (number) |
| `buy_info` | `price` (number) |

### Guenièvre de la Barre (`dataset/guenivre/` — 50 files)

Ghost. Frightens players and steals coins.

| Tool | Arguments |
|------|-----------|
| `fear` | — |
| `steal_coin` | `amount` (number) |
| `list_info` | — |

### Validation

Run the following to verify tool sets from the dataset files:

```bash
python3 validate_tools.py
```