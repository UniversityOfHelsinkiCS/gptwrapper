FROM node:22-alpine

WORKDIR /opt/app-root/src

COPY . .

RUN npm i

RUN mkdir -p ./uploads && chmod 777 ./uploads

RUN chmod 777 -R .

USER 1001

CMD ["tsx", "worker.ts"]
