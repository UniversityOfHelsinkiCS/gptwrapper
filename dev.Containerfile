FROM docker.io/node:20-alpine

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root

ENV VERSION=development
ENV VITE_VERSION=development

COPY index.html ./
COPY vite.config.ts ./
COPY tsconfig.* ./
COPY package* ./
COPY ./.npmrc ./
RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev"]
