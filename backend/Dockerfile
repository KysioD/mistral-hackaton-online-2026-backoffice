# Stage 1: Build
FROM node:22-slim AS builder

RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install ALL dependencies (including dev)
RUN npm install

# Copy source code and prisma schema
COPY backend/ .
# Copy dataset for seeding
COPY dataset/ /dataset

# Generate Prisma Client & Build
RUN npx prisma generate
RUN npm run build

# Stage 2: Production
FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy everything needed from the builder — avoids missing wasm/bin files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/tsconfig.seed.json ./tsconfig.seed.json
COPY --from=builder /app/dist ./dist
COPY --from=builder /dataset /dataset

EXPOSE 3000

CMD ["node", "dist/src/main"]
