# Robust Dockerfile for Render Monorepo
# This version works best when 'Root Directory' is set to 'backend' in Render.
FROM node:20-slim

WORKDIR /usr/src/app

# If Root Directory is 'backend', these will find package.json in the current context.
# If Root Directory is (empty), these might fail, but we'll try to be flexible.
COPY package*.json ./
# If the above fails in some environments, we can try: 
# COPY backend/package*.json ./ 
# but that's mutually exclusive.

RUN npm install --only=production

# Copy everything from the current context (which should be the 'backend' folder)
COPY . .

EXPOSE 8080

# Health check using the helper script
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node healthcheck.js || exit 1

CMD [ "node", "server.js" ]
