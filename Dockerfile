# Use official Node.js LTS image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

RUN npx prisma migrate  


# Build TypeScript
RUN npm run build


# Expose the port (default to 3000, can be overridden by env)
EXPOSE 4001

# Start the server
CMD ["node", "dist/server.js"] 