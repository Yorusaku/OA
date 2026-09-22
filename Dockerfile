FROM node:20-alpine AS builder

ENV PNPM_HOME=/pnpm
ENV PATH=${PNPM_HOME}:${PATH}

RUN corepack enable && corepack prepare pnpm@10.28.2 --activate

WORKDIR /workspace
COPY . .

# pnpm-lock.yaml is not versioned in this demo repository, so the image build
# accepts a locally supplied lockfile but does not require one to be present.
RUN pnpm install --no-frozen-lockfile
RUN pnpm --filter panorama-oa-bff build
RUN pnpm --filter panorama-oa-bff --prod deploy --legacy /app

FROM node:20-alpine AS runtime

ENV NODE_ENV=production
ENV BFF_HOST=0.0.0.0
ENV BFF_PORT=8088

WORKDIR /app
COPY --from=builder /app ./

EXPOSE 8088

CMD ["node", "dist/server.js"]
