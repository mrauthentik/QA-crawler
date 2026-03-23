FROM node:20-slim

RUN npm install -g pnpm@10.31.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/dashboard/ ./apps/dashboard/

RUN pnpm install --frozen-lockfile

# Build args for Next.js public env vars (baked in at build time)
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_AUTH_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AUTH_URL=$NEXT_PUBLIC_AUTH_URL

RUN cd apps/dashboard && pnpm run build

WORKDIR /app/apps/dashboard

EXPOSE 10000
ENV PORT=10000
ENV HOSTNAME=0.0.0.0

CMD ["pnpm", "run", "start"]
