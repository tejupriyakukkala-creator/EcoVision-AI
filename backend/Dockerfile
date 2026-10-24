FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm install -D typescript tsx @types/node
RUN npm run build

EXPOSE 5000

CMD ["node", "dist/server.js"]
