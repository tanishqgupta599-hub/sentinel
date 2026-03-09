# Use Node 20 slim image for a smaller footprint
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package manifests from the build context (which is the 'backend' folder)
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy the rest of the application source code from the build context
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Health check using the helper script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Run the web service on container startup
CMD [ "node", "server.js" ]
