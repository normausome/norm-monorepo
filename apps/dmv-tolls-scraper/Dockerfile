FROM oven/bun:1.4 AS build
WORKDIR /app
COPY package.json bunfig.toml ./
RUN bun install --frozen-lockfile
COPY tsconfig.json ./
COPY src ./src

FROM oven/bun:1.4-slim
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/bunfig.toml /app/tsconfig.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/src ./src
USER bun
CMD ["bun", "src/main.ts"]
