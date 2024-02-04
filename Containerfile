FROM registry.access.redhat.com/ubi9/nodejs-20-minimal

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root/src

ARG BASE_PATH
ENV PUBLIC_URL=$BASE_PATH

ARG STAGING
ENV STAGING=$STAGING

COPY package* ./
RUN npm ci --omit-dev --ignore-scripts
COPY . .

RUN npm run build

EXPOSE 8000

CMD ["npm", "run", "prod"]
