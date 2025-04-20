#!/bin/bash
set -e

echo "🔨 Building and pushing AI backend..."
docker build -t localhost:5000/ai-backend:latest ../ai/backend
docker push localhost:5000/ai-backend:latest

echo "🔨 Building and pushing AI frontend..."
docker build -t localhost:5000/ai-frontend:latest ../ai/frontend
docker push localhost:5000/ai-frontend:latest

echo "🔨 Building and pushing Chat backend..."
docker build -t localhost:5000/chat-backend:latest ../chat/backend
docker push localhost:5000/chat-backend:latest

echo "🔨 Building and pushing Chat frontend..."
docker build -t localhost:5000/chat-frontend:latest ../chat/frontend
docker push localhost:5000/chat-frontend:latest

echo "🔨 Building and pushing Chat Apache..."
docker build -t localhost:5000/chat-apache:latest ../chat/apache
docker push localhost:5000/chat-apache:latest

echo "🔨 Building and pushing CMS..."
docker build -t localhost:5000/cms:latest ../cms
docker push localhost:5000/cms:latest

echo "✅ All images built and pushed to local registry!"

