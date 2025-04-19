FROM node:18-alpine AS builder
WORKDIR /app
COPY chat/frontend/package*.json ./
RUN npm install
COPY chat/frontend/ ./
RUN npm run build

FROM nginx:alpine
COPY kubernetes/chat-frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 90
CMD ["nginx", "-g", "daemon off;"]
