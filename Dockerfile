# Build stage for frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Build stage for backend
FROM node:18-alpine AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm install --only=production

# Final stage
FROM node:18-alpine
WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Copy backend
COPY --from=backend-build /app/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# Copy frontend build
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Create data directory
RUN mkdir -p ./backend/data

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Use non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Start the application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "backend/src/index.js"] 