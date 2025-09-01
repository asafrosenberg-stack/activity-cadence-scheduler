# Use Node.js LTS version
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S scheduler -u 1001

# Change ownership of app directory
RUN chown -R scheduler:nodejs /app

# Switch to non-root user
USER scheduler

# Expose port (Railway will set PORT env var)
EXPOSE 3000

# Start the application
CMD ["npm", "start"]