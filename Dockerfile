# ---- Build stage: install deps ----
FROM node:20-slim AS deps

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies
RUN yarn install --production --frozen-lockfile

# Install all Playwright browsers for comprehensive scraping support
RUN npx playwright install chromium firefox webkit

# ---- Production stage ----
FROM node:20-slim

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy server code and package.json (needed for "type": "module")
COPY package.json ./
COPY server/ ./server/

# Koyeb uses PORT env var (defaults to 8000)
ENV PORT=8000
ENV NODE_ENV=production

EXPOSE 8000

# Health check for Koyeb
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8000) + '/api/sources').then(r => { if(!r.ok) throw r.status; process.exit(0); }).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
