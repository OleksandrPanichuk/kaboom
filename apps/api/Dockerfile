FROM oven/bun:1.4.2-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY packages/design/package.json packages/design/
RUN bun install --frozen-lockfile --linker hoisted --filter '@repo/api...'

FROM base AS dev

COPY --from=deps /app/node_modules ./node_modules
COPY package.json turbo.json ./
COPY packages/typescript-config packages/typescript-config
COPY packages/eslint-config packages/eslint-config
COPY packages/design packages/design
COPY apps/api apps/api

WORKDIR /app/apps/api

EXPOSE 8080

CMD ["bun", "--watch", "src/main.ts"]
