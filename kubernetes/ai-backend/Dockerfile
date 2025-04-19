FROM node:18-alpine AS builder
WORKDIR /app
COPY ai/backend/package*.json ./
RUN npm install --production

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY ai/backend/index.js ./index.js
RUN mkdir -p uploads

EXPOSE 89
CMD ["node", "index.js"]
