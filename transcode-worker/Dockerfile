FROM node:20-alpine AS builder

WORKDIR /app

# Copy package definition
COPY package*.json tsconfig.json ./

# Install all dependencies including devDependencies for build
RUN npm install

# Copy source code
COPY src ./src

# Build TypeScript to JavaScript in /app/dist
RUN npm run build

# Production image
FROM node:20-alpine

# Install FFmpeg and bash
RUN apk add --no-cache ffmpeg bash

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy built code from builder stage
COPY --from=builder /app/dist ./dist

# Create scratch directory for video processing
RUN mkdir -p /tmp/streamforge-worker && chmod 777 /tmp/streamforge-worker

ENV NODE_ENV=production
ENV WORKER_SCRATCH_DIR=/tmp/streamforge-worker

CMD ["node", "dist/index.js"]
