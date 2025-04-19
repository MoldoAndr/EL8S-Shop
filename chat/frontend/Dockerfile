FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build 

FROM nginx:alpine
COPY ./dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
RUN chmod -R 755 /usr/share/nginx/html && \
    ls -la /usr/share/nginx/html
EXPOSE 90
CMD ["nginx", "-g", "daemon off;"]
