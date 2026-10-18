# Build from the monorepo root: docker build -f apps/yt-scheduler/Dockerfile .
FROM node:20-slim AS build
ENV COREPACK_HOME=/root/.cache/corepack
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @apps/yt-scheduler... \
 && pnpm turbo run build --filter=@apps/yt-scheduler \
 && pnpm --filter @apps/yt-scheduler deploy --prod /out

FROM node:20-slim
WORKDIR /app
ENV NODE_ENV=production PORT=8787
COPY --from=build /out/node_modules ./node_modules
COPY --from=build /out/package.json ./package.json
COPY --from=build /repo/apps/yt-scheduler/dist ./dist
COPY --from=build /repo/apps/yt-scheduler/dist-server ./dist-server
EXPOSE 8787
CMD ["node", "dist-server/index.js"]
