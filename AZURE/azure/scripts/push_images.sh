#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}===== Pushing Images to Microk8s Registry (localhost:32000) =====${NC}"

# List of images to pull and push
IMAGES=(
  "statamic-custom"
  "chat-backend"
  "chat-frontend"
  "ai-backend"
  "ai-frontend"
)

# Function to pull from andreimoldovan2 and push to local registry
pull_tag_push() {
  local image_name=$1
  
  echo -e "${BLUE}Processing image: ${image_name}${NC}"
  
  # Pull the image from andreimoldovan2 repository
  echo -e "  - Pulling from andreimoldovan2/${image_name}..."
  docker pull andreimoldovan2/${image_name}
  
  if [ $? -eq 0 ]; then
    echo -e "  - ${GREEN}Pull successful${NC}"
  else
    echo -e "  - ${RED}Pull failed${NC}"
    return 1
  fi
  
  # Tag for local registry
  echo -e "  - Tagging for localhost:32000..."
  docker tag andreimoldovan2/${image_name} localhost:32000/${image_name}
  
  # Push to local registry
  echo -e "  - Pushing to localhost:32000/${image_name}..."
  docker push localhost:32000/${image_name}
  
  if [ $? -eq 0 ]; then
    echo -e "  - ${GREEN}Push successful${NC}"
  else
    echo -e "  - ${RED}Push failed${NC}"
    return 1
  fi
  
  echo -e "${GREEN}Successfully processed ${image_name}${NC}"
  echo ""
}

# Main execution
echo -e "${BLUE}Will process ${#IMAGES[@]} images${NC}"
echo ""

for image in "${IMAGES[@]}"; do
  pull_tag_push "$image"
done

# Additionally, pull and push standard images we'll need
echo -e "${BLUE}Processing standard images${NC}"
echo ""

STANDARD_IMAGES=(
  "nginx"
  "mongo"
  "mysql:8.1"
)

for image in "${STANDARD_IMAGES[@]}"; do
  echo -e "${BLUE}Processing standard image: ${image}${NC}"
  
  # For images with tags, we need to handle differently
  if [[ $image == *":"* ]]; then
    base_image="${image%:*}"
    tag="${image#*:}"
    
    echo -e "  - Pulling ${image}..."
    docker pull ${image}
    
    echo -e "  - Tagging for localhost:32000..."
    docker tag ${image} localhost:32000/${base_image}:${tag}
    
    echo -e "  - Pushing to localhost:32000/${base_image}:${tag}..."
    docker push localhost:32000/${base_image}:${tag}
  else
    echo -e "  - Pulling ${image}..."
    docker pull ${image}
    
    echo -e "  - Tagging for localhost:32000..."
    docker tag ${image} localhost:32000/${image}
    
    echo -e "  - Pushing to localhost:32000/${image}..."
    docker push localhost:32000/${image}
  fi
  
  echo -e "${GREEN}Successfully processed ${image}${NC}"
  echo ""
done

echo -e "${BLUE}Verifying registry content...${NC}"
curl localhost:32000/v2/_catalog

echo -e "${GREEN}===== Image Push Complete =====${NC}"