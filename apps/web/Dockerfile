# Build context is the repository root:
#   docker build -f apps/web/Dockerfile .
FROM node:22-alpine AS build
WORKDIR /repo

COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci

COPY packages/shared packages/shared
COPY apps/web apps/web

# Address of the API inside the Docker network (used by server-side rendering).
ARG INTERNAL_API_URL=http://api:4000
ENV INTERNAL_API_URL=$INTERNAL_API_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build -w @invitation/shared && npm run build -w @invitation/web

FROM node:22-alpine AS run
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV INTERNAL_API_URL=http://api:4000
WORKDIR /repo

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
