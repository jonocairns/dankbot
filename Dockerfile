FROM node:16

WORKDIR /usr/src/app

RUN touch .env

COPY . .

RUN yarn install

RUN yarn build

CMD [ "node", "dist/index.js" ]