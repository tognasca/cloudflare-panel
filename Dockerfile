FROM node:18 AS builder

WORKDIR /app
COPY . .

RUN corepack enable
RUN pnpm install
RUN pnpm build

FROM node:18

WORKDIR /app
COPY --from=builder /app .

RUN corepack enable
RUN pnpm install --prod

EXPOSE 3001

CMD ["node", "server/_core/index.js"]