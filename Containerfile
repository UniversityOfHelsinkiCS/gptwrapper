FROM registry.access.redhat.com/ubi9/nodejs-18-minimal

ENV TZ="Europe/Helsinki"

WORKDIR /opt/app-root/src

ARG STAGING
ENV STAGING=$STAGING

COPY package* ./
RUN npm ci --omit-dev --ignore-scripts
COPY . .

EXPOSE 3000

CMD ["npm", "run", "prod"]
