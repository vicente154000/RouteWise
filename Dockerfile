# ============================================================
# Dockerfile — RouteWise (Next.js 14)
# Multi-stage build: base → dependencies → build → production
# ============================================================

# ---- Stage 1: Base ----
FROM node:20-alpine AS base
WORKDIR /app

# ---- Stage 2: Dependencies ----
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --only=production

# ---- Stage 3: Build ----
FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- Stage 4: Production ----
FROM node:20-alpine AS production
WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 routewise && \
    adduser --system --uid 1001 routewise

# Copy production artifacts from build stage
COPY --from=build /app/.next ./.next
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/next.config.mjs ./next.config.mjs

# Copy node_modules (production only) from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Set environment
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Switch to non-root user
USER routewise

# Start the Next.js server
CMD ["npm", "start"]
