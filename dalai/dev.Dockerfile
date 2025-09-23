FROM node:22-alpine

WORKDIR /opt/app-root/src

COPY . .

RUN npm i

CMD ["npm", "run", "dev"]
