FROM node:20-slim

RUN npm install -g pnpm@10.31.0

WORKDIR /app

COPY apps/pinger/package.json ./
RUN pnpm install

COPY apps/pinger/index.ts ./

ENV API_URL=https://qa-detective-api-production.up.railway.app/health
ENV AUTH_URL=https://qa-detective-auth-production.up.railway.app/health
ENV DASHBOARD_URL=https://qa-detective-dashboard-production.up.railway.app

CMD ["pnpm", "run", "start"]
