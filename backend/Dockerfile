# BULLETPROOF Context-Aware Dockerfile for Render Monorepo
# This version works whether Render uses the root directory OR the backend folder.
FROM node:20-slim

WORKDIR /usr/src/app

# Copy EVERYTHING from the current context
COPY . .

# SMART CONTEXT CHECK: 
# If a folder named 'backend' exists, it means Render is using the Git ROOT as context.
# We move into that folder so we find the correct package.json and server.js.
RUN if [ -d "backend" ]; then \
    echo "--- DETECTED ROOT CONTEXT ---"; \
    mv backend/* ./ && mv backend/.[!.]* ./ 2>/dev/null || true; \
    else \
    echo "--- DETECTED BACKEND CONTEXT ---"; \
    fi

# Now install the correct dependencies for the backend
RUN npm install --only=production

EXPOSE 8080

# Health check using the helper script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

# Run the backend service
CMD [ "node", "server.js" ]
