#!/bin/bash
# Script to organize Kubernetes YAML files and all.sh

# Create directory structure
echo "Creating directory structure..."
mkdir -p kubernetes/cms
mkdir -p kubernetes/chat
mkdir -p kubernetes/ai
mkdir -p kubernetes/common

# Move CMS related files
echo "Moving CMS files..."
mv cms/statamic-deployment.yaml kubernetes/cms/

# Move Chat related files
echo "Moving Chat files..."
mv chat/chat-deployment.yaml kubernetes/chat/

# Move AI related files
echo "Moving AI files..."
mv ai/ai-deployment.yaml kubernetes/ai/

# Move common files
echo "Moving common files..."
mv network-policy.yaml kubernetes/common/
mv azure-egress-policy.yaml kubernetes/common/
mv metallb-config.yaml kubernetes/common/
mv ingress.yaml kubernetes/common/
mv kind.yaml kubernetes/common/
mv secret.yaml kubernetes/common/

# Update all.sh script and move to root
echo "Updating and moving all.sh..."
sed -i 's|kubectl apply -f network-policy.yaml|kubectl apply -f kubernetes/common/network-policy.yaml|g' all.sh
sed -i 's|kubectl apply -f secret.yaml|kubectl apply -f kubernetes/common/secret.yaml|g' all.sh
sed -i 's|kubectl apply -f ingress.yaml|kubectl apply -f kubernetes/common/ingress.yaml|g' all.sh
sed -i 's|kubectl apply -f cms/statamic-deployment.yaml|kubectl apply -f kubernetes/cms/statamic-deployment.yaml|g' all.sh
sed -i 's|kubectl apply -f chat/chat-deployment.yaml|kubectl apply -f kubernetes/chat/chat-deployment.yaml|g' all.sh
sed -i 's|kubectl apply -f ai/ai-deployment.yaml|kubectl apply -f kubernetes/ai/ai-deployment.yaml|g' all.sh

# Create a combined deployment file
echo "Creating combined deployment file..."
cat > kubernetes/deploy-all.yaml << EOF
# Combined deployment file for all components
---
apiVersion: v1
kind: Namespace
metadata:
  name: default
---
# Common resources
$(cat kubernetes/common/network-policy.yaml)
---
$(cat kubernetes/common/ingress.yaml)
---
# CMS resources
$(cat kubernetes/cms/statamic-deployment.yaml)
---
# Chat resources
$(cat kubernetes/chat/chat-deployment.yaml)
---
# AI resources
$(cat kubernetes/ai/ai-deployment.yaml)
EOF

echo "Organization complete. New structure:"
find kubernetes -type f | sort

echo "You can now deploy all resources with: kubectl apply -f kubernetes/deploy-all.yaml"
