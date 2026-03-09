# Use Node 20 slim image for a smaller footprint
FROM node:20-slim

# Set the working directory
WORKDIR /usr/src/app

# --- The Fix: Specify the 'backend' subdirectory from the build context root ---
# Copy the backend's package manifests
COPY ./backend/package*.json ./

# Install ONLY the backend's production dependencies
RUN npm ci --only=production

# Copy the entire backend source code into the working directory
COPY ./backend/ .

# Expose the port the app runs on
EXPOSE 8080

# Health check using the helper script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Run the web service on container startup
CMD [ "node", "server.js" ]
