# Build context is the repository root:
#   docker build -f apps/api/Dockerfile .
FROM node:22-alpine AS build
RUN apk add --no-cache openssl
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @invitation/shared && npm run build -w @invitation/api
RUN npm prune --omit=dev

FROM node:22-alpine AS run
RUN apk add --no-cache openssl
ENV NODE_ENV=production
WORKDIR /repo/apps/api

COPY --from=build /repo/package.json /repo/package.json
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/packages/shared/package.json /repo/packages/shared/package.json
COPY --from=build /repo/packages/shared/dist /repo/packages/shared/dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma

USER node
EXPOSE 4000
# Apply database migrations, then start the API.
CMD ["sh", "-c", "npx --no-install prisma migrate deploy && node dist/main.js"]
