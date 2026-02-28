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