FROM node:20-slim

RUN npm install -g pnpm@10.31.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/auth/ ./apps/auth/

RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/auth

EXPOSE 10000

CMD ["pnpm", "run", "start"]
