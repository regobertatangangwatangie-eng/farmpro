# ---------- Base Image ----------
FROM node:20-slim

# ---------- Environment ----------
ENV NODE_ENV=production

# ---------- App Directory ----------
WORKDIR /usr/src/app

# ---------- Install Dependencies First (Better Caching) ----------
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ---------- Copy Application Source ----------
COPY server.js db.js ./

# ---------- Create Required Directories ----------
RUN mkdir -p data

# ---------- Install curl for healthcheck ----------
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# ---------- Security: Run as Non-Root ----------
RUN useradd --user-group --create-home --shell /bin/false appuser \
    && chown -R appuser:appuser /usr/src/app

USER appuser

# ---------- Expose Port ----------
EXPOSE 3000

# ---------- Health Check ----------
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# ---------- Start Application ----------
CMD ["node", "server.js"]