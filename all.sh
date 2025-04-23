#!/bin/bash
set -e
 
# Define colors for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========== Kubernetes Deployment Script ==========${NC}"

# Step 1: Delete existing Kind cluster if it exists
echo -e "${BLUE}Deleting existing Kind cluster...${NC}"
if kind get clusters | grep -q ecommerce-cluster; then
  kind delete cluster --name ecommerce-cluster
  echo -e "${GREEN}Existing cluster deleted successfully.${NC}"
else
  echo -e "${GREEN}No existing cluster found.${NC}"
fi

# Step 2: Create local Docker registry if it doesn't exist
echo -e "${BLUE}Setting up local Docker registry...${NC}"
if [ "$(docker ps -q -f name=kind-registry)" ]; then
  echo "Registry container already exists, stopping and removing..."
  docker stop kind-registry
  docker rm kind-registry
fi
docker run -d --restart=always --name kind-registry -p 5000:5000 registry:2
echo -e "${GREEN}Local registry started at localhost:5000${NC}"

# Step 3: Create new Kind cluster with proper configuration
echo -e "${BLUE}Creating new Kind cluster...${NC}"
cat <<EOF | kind create cluster --name ecommerce-cluster --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
containerdConfigPatches:
- |-
  [plugins."io.containerd.grpc.v1.cri".registry.mirrors."localhost:5000"]
    endpoint = ["http://kind-registry:5000"]
EOF
echo -e "${GREEN}New Kind cluster created successfully.${NC}"

# Step 4: Connect the registry to the Kind network
echo -e "${BLUE}Connecting registry to Kind network...${NC}"
docker network connect kind kind-registry || true
echo -e "${GREEN}Registry connected to Kind network.${NC}"

# Step 5: Install Ingress controller
echo -e "${BLUE}Installing NGINX Ingress Controller...${NC}"
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/kind/deploy.yaml
echo -e "${GREEN}Ingress controller installed. Waiting for it to be ready...${NC}"

# Wait for Ingress controller pods to be ready
echo -e "${BLUE}Waiting for Ingress controller to be ready...${NC}"
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=90s || echo -e "${RED}Timeout waiting for Ingress controller. Continuing anyway...${NC}"

# Step 6: Build and push Docker images
echo -e "${BLUE}Building and pushing Docker images...${NC}"

# Function to build and push an image
build_and_push() {
  local dir=$1
  local image_name=$2

  echo -e "${BLUE}Building $image_name...${NC}"
  cd $dir
  docker build -t registry.local:5000/$image_name:latest .
  docker tag registry.local:5000/$image_name:latest localhost:5000/$image_name:latest
  docker push localhost:5000/$image_name:latest
  echo -e "${GREEN}$image_name built and pushed successfully.${NC}"
  cd - > /dev/null
}

# Build and push all images
build_and_push "cms" "statamic-custom"
build_and_push "chat/apache" "chat-apache"
build_and_push "chat/backend" "chat-backend"
build_and_push "chat/frontend" "chat-frontend"
build_and_push "ai/backend" "ai-backend"
build_and_push "ai/frontend" "ai-frontend"

echo -e "${BLUE}All images built and pushed successfully.${NC}"

echo -e "${GREEN}Ingress manifest created.${NC}"

# Step 8: Apply Kubernetes manifests
echo -e "${BLUE}Waiting 15 seconds before applying Kubernetes manifests...${NC}"
sleep 15

echo -e "${BLUE}Applying Kubernetes manifests...${NC}"
kubectl apply -f secret.yaml
kubectl apply -f cms/statamic-deployment.yaml
kubectl apply -f chat/chat-deployment.yaml
kubectl apply -f ai/ai-deployment.yaml
kubectl apply -f ingress.yaml

echo -e "${GREEN}All manifests applied successfully.${NC}"

# Step 9: Wait for all deployments to be ready
echo -e "${BLUE}Waiting for all deployments to be ready...${NC}"
kubectl get deployments -o name | xargs -I{} kubectl rollout status {}

echo -e "${GREEN}====================${NC}"
echo -e "${GREEN}Deployment complete!${NC}"
echo -e "${GREEN}====================${NC}"
echo -e "${GREEN}You can now access:${NC}"
echo -e "${GREEN}CMS: http://localhost/${NC}"
echo -e "${GREEN}Chat: http://localhost/chat${NC}"
echo -e "${GREEN}AI: http://localhost/ai${NC}"
echo -e "${GREEN}====================${NC}"

# Show running pods
echo -e "${BLUE}Currently running pods:${NC}"
kubectl get pods

# Show Ingress status
echo -e "${BLUE}Ingress status:${NC}"
kubectl get ingress
