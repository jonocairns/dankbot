FROM node:16.18.0-alpine as build

WORKDIR /usr/src/app

RUN touch .env

COPY . .

RUN yarn install

RUN yarn build

RUN yarn install --production --ignore-scripts --prefer-offline

FROM node:16.18.0-alpine 

ENV NODE_ENV=production
USER node
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package.json /usr/src/app/
COPY --from=build /usr/src/app/node_modules/ /usr/src/app/node_modules/
COPY --from=build /usr/src/app/dist/ /usr/src/app/dist/
COPY --from=build /usr/src/app/sounds/ /usr/src/app/sounds/

CMD [ "node", "dist/index.js" ]