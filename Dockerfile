FROM node:26.13.0-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY dist/ ./dist/
ENTRYPOINT ["node", "dist/index.js"]
