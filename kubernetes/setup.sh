#!/bin/bash
set -e  

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() {
  echo -e "${BLUE}[$(date +%T)]${NC} $1"
}

print_success() {
  echo -e "${GREEN}[$(date +%T)] ✓ $1${NC}"
}

print_warning() {
  echo -e "${YELLOW}[$(date +%T)] ⚠ $1${NC}"
}

print_error() {
  echo -e "${RED}[$(date +%T)] ✗ $1${NC}"
}

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

check_prerequisites() {
  print_status "Checking prerequisites..."
  
  if ! command_exists kind; then
    print_error "kind is not installed. Please install it first."
    exit 1
  fi
  
  if ! command_exists kubectl; then
    print_error "kubectl is not installed. Please install it first."
    exit 1
  fi
  
  if ! command_exists docker; then
    print_error "docker is not installed. Please install it first."
    exit 1
  fi
  
  print_success "All prerequisites are installed."
}

delete_cluster() {
  print_status "Deleting existing cluster..."
  if kind get clusters | grep -q kind; then
    kind delete cluster
    print_success "Existing cluster deleted."
  else
    print_warning "No existing cluster found."
  fi
}

create_cluster() {
  print_status "Creating new cluster with kind..."
  kind create cluster --config kind-config.yaml
  print_success "Cluster created successfully."
  
  print_status "Waiting for control plane to be ready..."
  until kubectl get nodes kind-control-plane --no-headers | grep -q "Ready"; do
    printf "."
    sleep 2
  done
  echo ""
  print_success "Control plane is ready."
}

setup_registry() {
  print_status "Setting up container registry..."

  if docker ps -a | grep -q registry; then
    print_warning "Removing existing registry container..."
    docker stop registry 2>/dev/null || true
    docker rm registry 2>/dev/null || true
  fi
  
  print_status "Starting registry container..."
  docker run -d -p 5000:5000 --restart=always --name registry registry:2
  
  print_status "Connecting registry to kind network..."
  if kubectl config current-context | grep -q kind; then
    docker network connect kind registry 2>/dev/null || true
    print_success "Registry connected to kind network."
  else
    print_error "Not using kind context. Cannot connect registry to kind network."
    exit 1
  fi
}

build_push_images() {
  print_status "Building and pushing images to registry..."
  bash pusher.sh
  print_success "All images built and pushed to registry."
}

create_configmaps() {
  print_status "Creating ConfigMaps for Nginx configurations..."
  
  if [ -f "ai-frontend/nginx.conf" ]; then
    kubectl create configmap ai-frontend-nginx-config --from-file=nginx.conf=ai-frontend/nginx.conf --dry-run=client -o yaml | kubectl apply -f -
    print_success "AI frontend nginx ConfigMap created."
  else
    print_warning "ai-frontend/nginx.conf not found, creating default config..."
    
    mkdir -p ai-frontend
    cat > ai-frontend/nginx.conf << 'EOF'
server {
    listen 91;
    server_name localhost;
    
    # Check referer header
    if ($http_referer !~* "^http://localhost:30080") {
        return 403 "Direct access not allowed";
    }
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy API requests to backend
    location /api {
        proxy_pass http://ai-backend:89;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF
    kubectl create configmap ai-frontend-nginx-config --from-file=nginx.conf=ai-frontend/nginx.conf --dry-run=client -o yaml | kubectl apply -f -
    print_success "Default AI frontend nginx ConfigMap created."
  fi
  
  if [ -f "chat-frontend/nginx.conf" ]; then
    kubectl create configmap chat-frontend-nginx-config --from-file=nginx.conf=chat-frontend/nginx.conf --dry-run=client -o yaml | kubectl apply -f -
    print_success "Chat frontend nginx ConfigMap created."
  else
    print_warning "chat-frontend/nginx.conf not found, creating default config..."
    
    mkdir -p chat-frontend
    cat > chat-frontend/nginx.conf << 'EOF'
server {
    listen 90;
    server_name localhost;
    
    # Check referer header
    if ($http_referer !~* "^http://localhost:30080") {
        return 403 "Direct access not allowed";
    }
    
    root /usr/share/nginx/html;
    index index.html index.htm;
    
    # For Angular routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Proxy WebSocket connections to backend
    location /ws {
        proxy_pass http://chat-backend:88;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_read_timeout 86400;
    }
}
EOF
    kubectl create configmap chat-frontend-nginx-config --from-file=nginx.conf=chat-frontend/nginx.conf --dry-run=client -o yaml | kubectl apply -f -
    print_success "Default Chat frontend nginx ConfigMap created."
  fi
}

deploy_application() {
  print_status "Deploying the application..."
  kubectl apply -k .
  print_success "Application deployed successfully."
}

wait_for_pods() {
  print_status "Waiting for all pods to become ready..."
  
  local timeout=300
  local start_time=$(date +%s)
  
  while true; do
    local current_time=$(date +%s)
    local elapsed=$((current_time - start_time))
    
    if [ $elapsed -gt $timeout ]; then
      print_error "Timeout waiting for pods to become ready."
      kubectl get pods
      return 1
    fi
    
    local not_ready=$(kubectl get pods --no-headers | grep -v "Running\|Completed" | wc -l)
    if [ $not_ready -eq 0 ]; then
      local total_pods=$(kubectl get pods --no-headers | wc -l)
      print_success "All $total_pods pods are ready."
      return 0
    fi
    
    if [ $((elapsed % 10)) -eq 0 ]; then
      kubectl get pods
    fi
    
    sleep 5
  done
}

show_access_info() {
  print_status "Deployment complete! Access your application at:"
  
  local node_port_cms=$(kubectl get service cms -o jsonpath='{.spec.ports[0].nodePort}')
  local node_port_chat=$(kubectl get service chat-frontend -o jsonpath='{.spec.ports[0].nodePort}')
  local node_port_ai=$(kubectl get service ai-frontend -o jsonpath='{.spec.ports[0].nodePort}')
  
  echo -e "${GREEN}CMS:${NC} http://localhost:$node_port_cms"
  echo -e "${GREEN}Chat:${NC} http://localhost:$node_port_chat (embedded in CMS)"
  echo -e "${GREEN}AI:${NC} http://localhost:$node_port_ai (embedded in CMS)"
  
  echo ""
  echo -e "${YELLOW}Note:${NC} Direct access to Chat and AI services is restricted via referer checking."
  echo -e "Access these services through the CMS interface."
}

main() {
  check_prerequisites
  delete_cluster
  create_cluster
  setup_registry
  build_push_images
  create_configmaps
  deploy_application
  wait_for_pods
  show_access_info
}

main
