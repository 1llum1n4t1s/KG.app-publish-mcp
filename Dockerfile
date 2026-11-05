FROM oven/bun:1.4.4-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN bun install --network-concurrency=4 --frozen-lockfile --production
COPY dist/ ./dist/
ENTRYPOINT ["bun", "--no-install", "--no-env-file", "dist/index.js"]
