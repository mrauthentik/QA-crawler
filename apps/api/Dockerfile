FROM node:20-slim

# Install pnpm
RUN npm install -g pnpm@10.31.0

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

# Tell Playwright to use system Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Copy monorepo root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/

# Install Node dependencies
RUN pnpm install --frozen-lockfile

# Install Python dependencies for security agent
RUN pip3 install \
    playwright==1.58.0 \
    requests==2.33.1 \
    beautifulsoup4==4.14.3 \
    --break-system-packages

# Install Playwright Python browser
RUN python3 -m playwright install chromium

WORKDIR /app/apps/api

EXPOSE 10000

CMD ["pnpm", "run", "start"]
