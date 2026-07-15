FROM node:22-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]
