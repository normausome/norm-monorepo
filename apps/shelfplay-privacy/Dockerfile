# Railway (and local Docker) image for the ShelfPlay privacy policy static page.
# Build:  docker build -t shelfplay-privacy .
# Run:    docker run --rm -p 8080:8080 -e PORT=8080 shelfplay-privacy

FROM oven/bun:1.4-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package.json server.ts index.html ./
USER bun
EXPOSE 8080
CMD ["bun", "run", "server.ts"]
