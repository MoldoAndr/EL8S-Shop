FROM node:20-alpine
RUN apk add --no-cache ca-certificates tzdata \
 && sed -i '/DST Root CA X3/d' /etc/ssl/certs/ca-certificates.crt \
 && update-ca-certificates
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 89
CMD ["node", "index.js"]
