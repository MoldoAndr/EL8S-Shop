FROM node:18.20.8
RUN apt-get update && apt-get install -y ca-certificates && update-ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY .env* ./
COPY . .
EXPOSE 89
CMD ["node", "index.js"]
