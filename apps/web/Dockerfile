FROM oven/bun:1.4.2-alpine AS base

WORKDIR /app

FROM base AS deps

COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY packages/api-client/package.json packages/api-client/
COPY packages/design/package.json packages/design/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/typescript-config/package.json packages/typescript-config/
COPY cli-tools/api-codegen/package.json cli-tools/api-codegen/
RUN bun install --frozen-lockfile --linker hoisted --filter '@repo/web...' --filter '@repo/api-codegen...'

FROM base AS dev

COPY --from=deps /app/node_modules ./node_modules
COPY package.json turbo.json ./
COPY packages packages
COPY cli-tools/api-codegen cli-tools/api-codegen
COPY apps/api apps/api
COPY apps/web apps/web

EXPOSE 3000

CMD ["sh", "-c", "cd /app/packages/api-client && bun run generate && cd /app/apps/web && bun run generate && bun run dev --host 0.0.0.0"]
