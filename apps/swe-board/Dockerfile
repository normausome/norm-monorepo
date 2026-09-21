# One image for both Railway services. The web service runs the default CMD.
# The cron service overrides the start command with `bun scraper/cli.ts`.
# Build:  docker build -t swe-board .
# Web:    docker run --rm -p 8790:8790 -e DATABASE_URL=... swe-board
# Scrape: docker run --rm -e DATABASE_URL=... swe-board bun scraper/cli.ts

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
COPY --from=build /app/db ./db
COPY --from=build /app/scraper ./scraper
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared
COPY --from=build /app/dist ./dist
USER bun
EXPOSE 8790
CMD ["bun", "server/index.ts"]
