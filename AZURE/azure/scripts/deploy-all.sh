#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== Deploying All Kubernetes Resources ==========${NC}"

# Get current directory
CURRENT_DIR=$(pwd)
BASE_DIR=$(basename "$CURRENT_DIR")

# Check if we're in the kubernetes directory
if [ "$BASE_DIR" = "kubernetes" ]; then
    # We are already in the kubernetes directory, use "." as the base path
    K8S_DIR="."
elif [ -d "kubernetes" ]; then
    # We are in the parent directory, use "kubernetes" as the base path
    K8S_DIR="kubernetes"
else
    echo -e "${RED}Error: Cannot determine the kubernetes directory location${NC}"
    echo -e "${YELLOW}Make sure you're running this script from either:${NC}"
    echo -e "${YELLOW}  - /home/azureuser/ (where the kubernetes directory is a subdirectory)${NC}"
    echo -e "${YELLOW}  - /home/azureuser/kubernetes/ (directly in the kubernetes directory)${NC}"
    exit 1
fi

echo -e "${GREEN}Using kubernetes directory: $K8S_DIR${NC}"

# Set the kubectl command to use microk8s kubectl directly
KUBECTL="microk8s kubectl"
echo -e "${BLUE}Using command: $KUBECTL${NC}"

# Apply resources in the correct order
echo -e "${BLUE}Applying all resources in the correct order...${NC}"

# 1. Apply secrets first
echo -e "${BLUE}1. Applying secrets...${NC}"
if [ -d "$K8S_DIR/secrets" ] && [ "$(ls -A $K8S_DIR/secrets 2>/dev/null)" ]; then
    $KUBECTL apply -f $K8S_DIR/secrets/
    echo -e "${GREEN}Secrets applied successfully${NC}"
else
    echo -e "${YELLOW}No secret files found in $K8S_DIR/secrets/ or directory is empty${NC}"
fi

# 2. Apply common resources
echo -e "${BLUE}2. Applying common resources...${NC}"
if [ -d "$K8S_DIR/common" ] && [ "$(ls -A $K8S_DIR/common 2>/dev/null)" ]; then
    $KUBECTL apply -f $K8S_DIR/common/
    echo -e "${GREEN}Common resources applied successfully${NC}"
else
    echo -e "${YELLOW}No common resource files found in $K8S_DIR/common/ or directory is empty${NC}"
fi

# 3. Apply deployments
echo -e "${BLUE}3. Applying CMS deployment...${NC}"
if [ -d "$K8S_DIR/cms" ] && [ "$(ls -A $K8S_DIR/cms 2>/dev/null)" ]; then
    $KUBECTL apply -f $K8S_DIR/cms/
    echo -e "${GREEN}CMS deployment applied successfully${NC}"
else
    echo -e "${YELLOW}No CMS deployment files found in $K8S_DIR/cms/ or directory is empty${NC}"
fi

echo -e "${BLUE}4. Applying Chat deployment...${NC}"
if [ -d "$K8S_DIR/chat" ] && [ "$(ls -A $K8S_DIR/chat 2>/dev/null)" ]; then
    $KUBECTL apply -f $K8S_DIR/chat/
    echo -e "${GREEN}Chat deployment applied successfully${NC}"
else
    echo -e "${YELLOW}No Chat deployment files found in $K8S_DIR/chat/ or directory is empty${NC}"
fi

echo -e "${BLUE}5. Applying AI deployment...${NC}"
if [ -d "$K8S_DIR/ai" ] && [ "$(ls -A $K8S_DIR/ai 2>/dev/null)" ]; then
    $KUBECTL apply -f $K8S_DIR/ai/
    echo -e "${GREEN}AI deployment applied successfully${NC}"
else
    echo -e "${YELLOW}No AI deployment files found in $K8S_DIR/ai/ or directory is empty${NC}"
fi

# Wait for deployments to be ready
echo -e "${BLUE}Waiting for deployments to become ready...${NC}"
$KUBECTL get deployments | grep -v NAME | awk '{print $1}' | xargs -I{} $KUBECTL rollout status deployment/{} || true

# Check deployment status
echo -e "${BLUE}Checking deployment status...${NC}"
$KUBECTL get pods -o wide

# Display services
echo -e "${BLUE}Available services:${NC}"
$KUBECTL get svc

# Display ingress
echo -e "${BLUE}Ingress status:${NC}"
$KUBECTL get ingress

# Display HPAs
echo -e "${BLUE}Horizontal Pod Autoscalers:${NC}"
$KUBECTL get hpa

# Dashboard access instruction
echo -e "${GREEN}==========================================================${NC}"
echo -e "${GREEN}All resources applied successfully!${NC}"
echo -e "${GREEN}==========================================================${NC}"
echo -e "${YELLOW}You can access the dashboard with:${NC}"
echo -e "${YELLOW}  microk8s dashboard-proxy${NC}"
echo -e "${YELLOW}Your application should be accessible at:${NC}"
echo -e "${YELLOW}  http://<your-vm-public-ip>/${NC}"
echo -e "${GREEN}==========================================================${NC}"

# Ask if user wants to monitor deployment
read -p "Do you want to monitor the deployment? (y/n): " MONITOR
if [[ "$MONITOR" == "y" || "$MONITOR" == "Y" ]]; then
    echo -e "${BLUE}Monitoring deployment (press Ctrl+C to exit)...${NC}"
    $KUBECTL get pods -w
else
    echo -e "${GREEN}Deployment complete!${NC}"
fi
