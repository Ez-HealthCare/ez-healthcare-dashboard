FROM node:24-alpine
WORKDIR /app
ENV HUSKY=0
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["sh", "-c", "node --loader ./esm-loader.mjs dist/database/setup.js && node --loader ./esm-loader.mjs dist/database/seeds/seed.js --auth-only && node --loader ./esm-loader.mjs dist/main.js"]
