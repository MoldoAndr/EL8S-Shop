FROM node:18-alpine AS build
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm install
RUN npm install --save-dev tailwindcss postcss autoprefixer gulp gulp-postcss gulp-replace
RUN npx tailwindcss init -p
COPY . .
RUN npx gulp

FROM nginx:alpine
COPY --from=build /app/dist/frontend/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 91
CMD ["nginx", "-g", "daemon off;"]