#!/bin/bash

# Deployment script for huaquai-web using Podman
# This script stops any existing container, builds a new image, and starts a new container

# Set variables
CONTAINER_NAME="pms-web"
IMAGE_NAME="pms-web"

# Print with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Error handling
set -e
trap 'log "Error occurred. Exiting..."; exit 1' ERR

log "Starting deployment process for $CONTAINER_NAME"

# Check if container exists and stop it
if podman ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    log "Container $CONTAINER_NAME exists"
    
    # Check if container is running
    if podman ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        log "Stopping container $CONTAINER_NAME"
        podman stop "$CONTAINER_NAME"
    fi
    
    log "Removing container $CONTAINER_NAME"
    podman rm "$CONTAINER_NAME"
else
    log "No existing container found with name $CONTAINER_NAME"
fi

# Navigate to project root directory
cd "$(dirname "$0")/.." 

# Check if podman-compose is available
if command -v podman-compose &> /dev/null; then
    # Build new image
    log "Building new image $IMAGE_NAME using podman-compose"
    # podman-compose build
    podman build -t "$IMAGE_NAME" .
    
    # Start new container
    log "Starting new container $CONTAINER_NAME using podman-compose"
    podman-compose up -d --no-deps --build web
else
    # Fallback to using regular podman commands if podman-compose is not available
    log "podman-compose not found, using regular podman commands"
    
    # Build new image
    log "Building new image $IMAGE_NAME"
    podman build -t "$IMAGE_NAME" .
    
    # Start new container with settings from docker-compose.yml
    log "Starting new container $CONTAINER_NAME"
    podman run -d \
        --name "$CONTAINER_NAME" \
        --expose 3000 \
        -e NODE_ENV=production \
        --restart always \
        --net traefik_default \
        --network-alias web \
        --label "traefik.enable=true" \
        --label "traefik.http.routers.pms-web.rule=Host(\`pms.huaquai.cn\`)" \
        --label "traefik.http.services.pms-web.loadbalancer.server.port=3000" \
        --label "traefik.http.routers.pms-web.entrypoints=webSecure" \
        --label "traefik.http.routers.pms-web.tls=true" \
        --label "traefik.http.routers.pms-web.tls.certresolver=resolver" \
        --label "traefik.http.routers.pms-web-http.rule=Host(\`pms.huaquai.cn\`)" \
        --label "traefik.http.routers.pms-web-http.entrypoints=web" \
        --label "traefik.http.routers.pms-web-http.middlewares=redirect-to-https" \
        --label "traefik.http.middlewares.redirect-to-https.redirectscheme.scheme=https" \
        "$IMAGE_NAME"
fi

log "Deployment completed successfully"