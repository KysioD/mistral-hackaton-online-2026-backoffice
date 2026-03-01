# Mistral Hackathon Online 2026 - Backoffice

This repository contains the backoffice project for the Mistral Hackathon Online 2026. The stack is separated into an API backend and a web frontend.

## Architecture

- **Backend**: NestJS framework using Prisma ORM.
- **Frontend**: Next.js framework using Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- Docker and Docker Compose (optional, for services setup)

### Local Development

You can run both the frontend and backend applications from their respective directories.

#### 1. Setup Backend

Navigate to the backend directory, install dependencies, and start the development server.

```bash
cd backend
npm install
npm run start:dev
```

*Note: Depending on your Prisma configuration, you may need to apply database migrations or set up local services via Docker first.*

#### 2. Setup Frontend

Open a new terminal, navigate to the frontend directory, install dependencies, and start the development server.

```bash
cd frontend
npm install
npm run dev
```

The frontend will run on [http://localhost:3000](http://localhost:3000) by default.

## Docker Setup

A `docker-compose.yml` file is provided to help run auxiliary services or your full stack.

```bash
docker-compose up -d
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