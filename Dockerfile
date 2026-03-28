FROM node:22-slim

WORKDIR /app

# Install all deps (including dev) for build
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Prune dev deps but keep tsx for migrations
RUN npm prune --omit=dev --ignore-scripts || true
RUN npm install tsx --ignore-scripts

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "run", "start"]
