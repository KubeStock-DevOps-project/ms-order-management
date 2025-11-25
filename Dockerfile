# Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install all dependencies (including devDependencies for build)
RUN npm ci && \
    npm cache clean --force

# Generate Prisma client
RUN npx prisma generate

# Production stage
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production && \
    npm cache clean --force

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy Prisma generated client from builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@prisma ./node_modules/@prisma

# Copy prisma schema
COPY --chown=nodejs:nodejs prisma ./prisma/

# Copy application code
COPY --chown=nodejs:nodejs src ./src/
COPY --chown=nodejs:nodejs order-management-service.yaml ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/v1/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["npm", "start"]
