FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm ci || npm install

# Install gulp and other dev dependencies explicitly
RUN npm install --save-dev gulp@4.0.2 gulp-replace@1.1.4

# Copy remaining files
COPY . .

# Set production environment
ENV NODE_ENV=production

# Build Angular app and run gulp to inline assets
RUN npm run build

# Verify the inlined assets
RUN ls -la dist/frontend/browser
RUN cat dist/frontend/browser/index.html | grep -c "<style>" || echo "No style tags found"
RUN cat dist/frontend/browser/index.html | grep -c "<script>" || echo "No script tags found"

# Use nginx for serving
FROM nginx:alpine
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 91
CMD ["nginx", "-g", "daemon off;"]