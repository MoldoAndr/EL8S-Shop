FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Install gulp dependencies explicitly (just to be sure)
RUN npm install --save-dev gulp gulp-replace

# Copy source code
COPY . .

# Run the gulp task to inline assets
RUN npx gulp

FROM nginx:alpine

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built files from builder stage
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html

# Expose port
EXPOSE 91

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
