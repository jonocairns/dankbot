FROM node:26-alpine AS build

# Compile native dependencies when the current Alpine release has no prebuild.
RUN apk add --no-cache python3 build-base

WORKDIR /usr/src/app

# Enable Corepack for Yarn 4
RUN corepack enable

RUN touch .env

# Copy package files and Yarn 4 configuration
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn .yarn

RUN yarn install --immutable --inline-builds

COPY . .

RUN yarn build

RUN yarn workspaces focus --production

FROM node:26-alpine 

RUN apk update && apk add --no-cache ffmpeg

ENV NODE_ENV=production
USER node
WORKDIR /usr/src/app

COPY --from=build /usr/src/app/package.json /usr/src/app/
COPY --from=build /usr/src/app/node_modules/ /usr/src/app/node_modules/
COPY --from=build /usr/src/app/dist/ /usr/src/app/dist/
COPY --from=build /usr/src/app/sounds/ /usr/src/app/sounds/

CMD [ "node", "dist/index.js" ]
