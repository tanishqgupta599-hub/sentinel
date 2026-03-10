# Use Node 20 slim image
FROM node:20-slim

# Set the working directory inside the container
WORKDIR /usr/src/app

# This Dockerfile assumes the build context is the project ROOT.
# This matches 'Root Directory = Blank' and 'Dockerfile Path = backend/Dockerfile'

# Copy package manifests from the backend folder
COPY backend/package*.json ./

# Install production dependencies
RUN npm install --only=production

# Copy the entire backend source code
COPY backend/ .

# Expose the port the app runs on
EXPOSE 8080

# Health check using the helper script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Run the web service on container startup
CMD [ "node", "server.js" ]
