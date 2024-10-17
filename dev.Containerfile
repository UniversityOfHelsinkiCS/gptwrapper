FROM docker.io/node:23-alpine

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root/src

COPY package* ./
RUN npm i

EXPOSE 3000

CMD ["npm", "run", "dev"]
