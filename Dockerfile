FROM node:24-alpine
WORKDIR /app
ENV HUSKY=0 NEXT_TELEMETRY_DISABLED=1
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
# Docker keeps internal port 3000; Compose publishes it as localhost:3001.
CMD ["node", "node_modules/next/dist/bin/next", "start", "--port", "3000"]
