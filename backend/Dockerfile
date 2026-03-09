# Use the official Node.js 20 slim image.
FROM node:20-slim

# Set the working directory in the container.
WORKDIR /usr/src/app

# This Dockerfile assumes the build context is the project's ROOT directory.

# Copy the package.json and package-lock.json from the 'backend' directory.
COPY backend/package*.json ./

# Install production dependencies. This now correctly uses the backend's package.json.
RUN npm ci --only=production

# Copy the rest of the backend's source code.
COPY backend/ .

# Expose port 8080 to the outside world.
EXPOSE 8080

# Healthcheck to ensure the service is running correctly.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js || exit 1

# The command to run when the container starts.
CMD [ "node", "server.js" ]
