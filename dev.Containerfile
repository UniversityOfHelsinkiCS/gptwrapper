FROM docker.io/node:20-alpine

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root/src

ENV VERSION=development
ENV VITE_VERSION=development

COPY package* ./
RUN curl -fsSL https://github.com/AikidoSec/safe-chain/releases/latest/download/install-safe-chain.sh | sh -s -- --ci
RUN npm ci

EXPOSE 3000

CMD ["npm", "run", "dev"]
