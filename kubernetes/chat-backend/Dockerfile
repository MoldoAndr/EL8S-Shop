FROM node:18-alpine AS builder
WORKDIR /app
COPY chat/backend/package*.json ./
RUN npm install --production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY chat/backend/index.js ./index.js

EXPOSE 88
CMD ["node", "index.js"]
