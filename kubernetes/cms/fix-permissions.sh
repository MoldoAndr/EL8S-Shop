#!/bin/bash
echo "Fixing Statamic permissions..."
kubectl exec -it $(kubectl get pods -l app=cms -o jsonpath='{.items[0].metadata.name}') -- \
  sh -c "chmod -R 775 /var/www/html/storage && chown -R www-data:www-data /var/www/html/storage"

echo "Permissions fixed successfully."
