FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci && npm cache clean --force

FROM deps AS build
COPY tsconfig.json tsconfig-paths-bootstrap.js ./
COPY src ./src
RUN npm run build

FROM node:20-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY tsconfig.json tsconfig-paths-bootstrap.js package.json ./
EXPOSE 7070
CMD ["node","-r","./tsconfig-paths-bootstrap.js","dist/index.js"]
