# Kubernetes Deployment

This directory contains all Kubernetes configuration files for deploying the complete application, including:
- Statamic CMS
- Chat application (WebSocket backend + Angular frontend)
- AI application (backend + Angular frontend)
- MongoDB for the chat application
- Private Docker registry for custom images

## Prerequisites

- Kubernetes cluster with at least 2 nodes
- kubectl configured to connect to your cluster
- Docker installed locally for building images
- Ingress controller installed in the cluster
- At least 30GB of available storage in the cluster
- Azure subscription with:
  - SQL Database (for AI application)
  - Blob Storage (for storing audio files)
  - Speech Service (for speech translation)

## Setup Steps

1. Set up Azure resources:
   - Create Azure SQL Database
   - Create Azure Blob Storage
   - Create Azure Speech Service
   - Update the configuration in `kubernetes/common/config.yaml` with your credentials

2. Make the scripts executable:
   ```bash
   chmod +x kubernetes/build.sh kubernetes/deploy.sh
   ```

3. Build and push Docker images to the private registry:
   ```bash
   ./kubernetes/build.sh
   ```

4. Deploy all services to Kubernetes:
   ```bash
   ./kubernetes/deploy.sh
   ```

5. Wait for all services to start (this may take a few minutes)

6. Access the application at: http://localhost

## Components

The application consists of the following components:

- **CMS (Statamic)**: Content Management System that hosts the main website
- **Chat Application**:
  - Backend: WebSocket server for real-time communication
  - Frontend: Angular-based chat interface
  - MongoDB: Database for storing chat messages
- **AI Application**:
  - Backend: Node.js API for handling audio file processing
  - Frontend: Angular-based interface for uploading files
  - Azure Services: For file storage and speech translation

## Deployment Details

The deployment uses:
- Multi-container pods for complex services
- Service discovery for inter-service communication
- ConfigMaps for configuration
- PersistentVolumeClaims for stateful data
- A private Docker registry for custom images
- Ingress for external access

## Maintenance

- To view logs for a specific pod:
  ```bash
  kubectl logs <pod-name>
  ```

- To restart a deployment:
  ```bash
  kubectl rollout restart deployment/<deployment-name>
  ```

- To scale a deployment:
  ```bash
  kubectl scale deployment/<deployment-name> --replicas=<number>
  ```

## Directory Structure

```
kubernetes/
├── ai-backend/           # AI backend configuration
├── ai-frontend/          # AI frontend configuration
├── chat-backend/         # Chat backend configuration
├── chat-frontend/        # Chat frontend configuration
├── cms/                  # CMS configuration
├── common/               # Common configuration (ingress, configs)
├── mongo/                # MongoDB configuration
├── registry/             # Private registry configuration
├── build.sh              # Script to build and push Docker images
├── deploy.sh             # Script to deploy all components
└── README.md             # This file
