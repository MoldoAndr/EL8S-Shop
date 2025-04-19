#!/bin/bash

echo "Deleting existing cluster..."
kind delete cluster

echo "Creating new cluster with kind..."
kind create cluster --config kind-config.yaml

echo "Waiting for control plane to be ready..."
sleep 10;

echo "Installing Ingress NGINX..."
kubectl label nodes kind-control-plane ingress-ready=true

echo "Starting the registry..."
docker run -d -p 5000:5000 --restart=always --name registry registry:2

echo "Connecting to the registry..."
if kubectl config current-context | grep -q kind; then     echo "Connecting registry to kind network...";     docker network connect kind registry 2>/dev/null || true; fi

echo "Pushing the images to the registry..."
bash pusher.sh


