FROM node:22-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package.json ./
RUN npm install

# Copy application source
COPY . .

# Build the Vite frontend into /app/dist
RUN npm run build

# Expose port 3000
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

# Start the Express + static server
CMD ["npx", "tsx", "server.ts"]
