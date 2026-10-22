# syntax=docker/dockerfile:1
# Fileflect web app — Next.js standalone output (see DEPLOY.md).

# Overridable to use a registry mirror (e.g. mirror.gcr.io/library/node:22-bookworm-slim).
ARG NODE_IMAGE=node:22-bookworm-slim

FROM ${NODE_IMAGE} AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1) Dependencies (cached while package-lock.json doesn't change).
FROM base AS deps
# The in-memory MongoDB used by tests is not needed to build.
ENV MONGOMS_DISABLE_POSTINSTALL=1
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# 2) Build. NEXT_PUBLIC_* values are inlined into the browser bundle, so
#    they must be passed as build arguments (Railway does this automatically
#    for service variables).
FROM base AS build
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_CONTACT_EMAIL
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ARG NEXT_PUBLIC_ADSENSE_SLOT_SIDEBAR
ARG NEXT_PUBLIC_ADSENSE_SLOT_RESULT
ARG NEXT_PUBLIC_MP_PUBLIC_KEY
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 3) Runtime: only the standalone server, static assets and public files.
FROM base AS run
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
