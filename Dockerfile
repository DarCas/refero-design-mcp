# syntax=docker/dockerfile:1

# Streamable HTTP image of refero-design-mcp. The stdio build needs no image:
# it is `npx -y @darcas/refero-design-mcp`.

ARG NODE_VERSION=22.23.2

FROM node:${NODE_VERSION}-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json tsconfig.build.json ./
COPY scripts ./scripts
COPY src ./src
RUN npm run build


FROM node:${NODE_VERSION}-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    REFERO_HTTP_HOST=0.0.0.0 \
    REFERO_HTTP_PORT=3000 \
    REFERO_CACHE_DIR=/data/cache

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

# The skill installer resolves `skill/` at runtime, next to `dist/`.
COPY skill ./skill

# The cache is what makes repeat calls cost a 304: keep it across restarts.
RUN mkdir -p /data/cache && chown -R node:node /data
VOLUME /data/cache

USER node
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+process.env.REFERO_HTTP_PORT+'/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"

CMD ["node", "dist/cli-http.js"]
