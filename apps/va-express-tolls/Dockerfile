# Railway (and any Docker host) image for the VA Express Tolls API + built front end.
# Build:  docker build -t va-express-tolls .
# Run:    docker run --rm -p 8787:8787 va-express-tolls
#
# Stage 1 installs everything and builds dist/. Stage 2 ships Bun, the server
# sources, dist/, and node_modules: the only runtime dep is the postgres client
# (adapters still use fetch). No Chromium/Playwright is needed at runtime.

FROM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bun.lock bunfig.toml ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

FROM oven/bun:1.4-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/tsconfig*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/src ./src
COPY --from=build /app/dist ./dist
USER bun
# Railway injects PORT; the server falls back to 8787 for local docker runs.
EXPOSE 8787
CMD ["bun", "server/index.ts"]
