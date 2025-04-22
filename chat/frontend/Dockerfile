FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install --save-dev gulp gulp-replace
COPY . .
RUN npx gulp

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/frontend/browser /usr/share/nginx/html
EXPOSE 90
CMD ["nginx", "-g", "daemon off;"]
