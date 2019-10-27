FROM mhart/alpine-node:10.17.0

WORKDIR /usr/src/app
COPY . .

RUN apk add --no-cache make gcc g++ python ffmpeg

RUN yarn install --frozen-lockfile --production

EXPOSE 3000
CMD ["yarn", "start:production"]