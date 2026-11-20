# Production image for Railway (or any Docker host).
# Builds the TanStack Start app as a Node server (Nitro "node-server" preset).
# The Lovable build is unaffected: it keeps targeting Cloudflare.

# ---- build -------------------------------------------------------------------
FROM node:22-slim AS build
WORKDIR /app

# Vite inlines VITE_* variables into the browser bundle at BUILD time, so they
# must be passed as build args. Railway forwards service variables to `ARG`s
# with the same name automatically.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_AUTH_MODE=supabase
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_AUTH_MODE=$VITE_AUTH_MODE

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN test -n "$VITE_SUPABASE_URL" -a -n "$VITE_SUPABASE_PUBLISHABLE_KEY" \
    || (echo "ERROR: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in Railway Variables" && exit 1)
RUN npm test && NITRO_PRESET=node-server npx vite build

# ---- runtime -----------------------------------------------------------------
# Nitro bundles all server dependencies into .output, so node_modules is not needed.
FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000
COPY --from=build --chown=node:node /app/.output ./.output
USER node
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
