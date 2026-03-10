# Use Node 20 slim image
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# This Dockerfile assumes the build context is the 'backend' folder itself.
# This is managed by the 'Root Directory' setting in Render.

# Copy package manifests from the current context
COPY package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the rest of the backend source code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Health check using the helper script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Run the web service on container startup
CMD [ "node", "server.js" ]
