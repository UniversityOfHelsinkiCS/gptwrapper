FROM registry.access.redhat.com/ubi9/nodejs-20-minimal

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root/src

ARG GIT_SHA
ENV REACT_APP_GIT_SHA=$GIT_SHA

ARG VERSION
ENV VERSION=$VERSION
ENV VITE_VERSION=$VERSION

ARG BASE_PATH
ENV PUBLIC_URL=$BASE_PATH

ARG STAGING
ENV STAGING=$STAGING

ARG CI
ENV CI=$CI

COPY package* ./
RUN npm ci --omit-dev --ignore-scripts --no-audit --no-fund
COPY . .

RUN npm run build

EXPOSE 8000

CMD ["npm", "run", "prod"]
