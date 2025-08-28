FROM docker.io/node:20-alpine

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root/src

ENV VERSION=development
ENV VITE_VERSION=development

COPY package* ./
RUN npm i

EXPOSE 3000

CMD ["npm", "run", "dev"]
