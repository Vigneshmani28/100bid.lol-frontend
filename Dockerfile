# 100BID frontend — Next.js (App Router), built for production and run on EC2.
#
# Build from the repo root:
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://yourdomain.com/api \
#     --build-arg NEXT_PUBLIC_DATAFAST_WEBSITE_ID=your-datafast-website-id \
#     -t 100bid-frontend:latest .
#
# IMPORTANT: NEXT_PUBLIC_* variables are baked into the JS bundle at BUILD
# time, not read at container start. If you change NEXT_PUBLIC_API_URL or
# NEXT_PUBLIC_DATAFAST_WEBSITE_ID later, you must rebuild and re-push the
# image — editing frontend.env on the EC2 host alone has no effect on these.

# ---- deps ----
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

ARG NEXT_PUBLIC_DATAFAST_WEBSITE_ID
ENV NEXT_PUBLIC_DATAFAST_WEBSITE_ID=${NEXT_PUBLIC_DATAFAST_WEBSITE_ID}

RUN npm run build

# ---- runtime ----
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

RUN apt-get update -y \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --create-home --shell /bin/bash app

# next.config.ts has output: "standalone" — this copies just the pruned
# server + the node_modules it actually needs, not the whole repo.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
