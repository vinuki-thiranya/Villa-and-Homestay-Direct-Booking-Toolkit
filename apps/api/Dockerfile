# Build from the repo root: docker build -f apps/api/Dockerfile .
FROM node:24-slim AS build
WORKDIR /repo
COPY package.json package-lock.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
RUN npm ci --workspace @staydirect/shared --workspace @staydirect/api --include-workspace-root
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @staydirect/shared && npm run build -w @staydirect/api \
 && npm prune --omit=dev --workspace @staydirect/shared --workspace @staydirect/api

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/shared packages/shared
COPY --from=build /repo/apps/api/package.json apps/api/package.json
COPY --from=build /repo/apps/api/dist apps/api/dist
COPY --from=build /repo/apps/api/migrations apps/api/migrations
WORKDIR /repo/apps/api
EXPOSE 4000
CMD ["node", "--enable-source-maps", "dist/src/main.js"]
