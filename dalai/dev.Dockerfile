FROM node:24-alpine

WORKDIR /opt/app-root/src

COPY . .

RUN npm ci

CMD ["npm", "run", "dev"]
