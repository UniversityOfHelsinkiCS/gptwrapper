FROM node:22-alpine

WORKDIR /opt/app-root/src

COPY . .

RUN npm i

# for pdf parsing
RUN apk add ghostscript
RUN apk add poppler-utils

RUN mkdir -p ./uploads && chmod 777 ./uploads

RUN chmod 777 -R .

USER 1001

CMD ["npm", "run", "start"]
