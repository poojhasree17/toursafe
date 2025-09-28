# Next.js Dockerfile for development
FROM node:18-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package*.json pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/web/ ./apps/web/

# Install dependencies
RUN pnpm install

# Build packages first
RUN pnpm --filter @toursafe/lib build
RUN pnpm --filter @toursafe/ui build

# Set working directory to web app
WORKDIR /app/apps/web

# Expose port
EXPOSE 3000

# Start development server
CMD ["pnpm", "dev"]
