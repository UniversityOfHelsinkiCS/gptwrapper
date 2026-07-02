FROM node:22-alpine

WORKDIR /opt/app-root/src

COPY . .

RUN npm ci

CMD ["npm", "run", "dev"]
