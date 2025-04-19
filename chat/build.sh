#!/bin/bash
echo "Building Docker containers..."
docker-compose build

echo "Starting Docker containers..."
sudo docker-compose up -d

echo "Application is available at:"
echo "- Frontend: http://localhost:90"
echo "- WebSocket: ws://localhost:88"
echo "- Proxy Apache: http://localhost"
