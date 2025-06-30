# Dockerfile for pms-pda

# Build stage
FROM node:22.14.0-alpine AS build-stage

WORKDIR /app

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install pnpm and dependencies
RUN npm install -g pnpm && pnpm install

# Copy the rest of the application source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM nginx:stable-alpine AS production-stage

# Copy built assets from the build stage
COPY --from=build-stage /app/dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]