FROM node:18-alpine AS builder
WORKDIR /app
COPY ai/frontend/package*.json ./
RUN npm install
COPY ai/frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY kubernetes/ai-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 91
CMD ["nginx", "-g", "daemon off;"]
