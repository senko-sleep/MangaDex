FROM node:20-slim

WORKDIR /app

# Set Playwright browsers path
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PORT=8000
ENV NODE_ENV=production

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies and install Playwright Chromium with system dependencies
RUN yarn install --production --frozen-lockfile \
    && npx playwright install --with-deps chromium \
    && rm -rf /var/lib/apt/lists/*

# Copy server code
COPY server/ ./server/

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8000) + '/api/sources').then(r => { if(!r.ok) throw r.status; process.exit(0); }).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]

