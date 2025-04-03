FROM node:22-alpine AS build
RUN apk add --no-cache make gcc g++ python3 libgpiod=1.6.4-r1 libgpiod-dev=1.6.4-r1 nodejs-dev && ln -sf python3 /usr/bin/python
ARG GITHUB_RUN_NUMBER

WORKDIR /blinkt-k8s-pod-visualization
COPY . ./
RUN npm ci && \
    npm run build && \
    npm ci --production

FROM node:22-alpine AS release

WORKDIR /blinkt-k8s-pod-visualization
COPY --from=build ./blinkt-k8s-pod-visualization/dist ./dist
COPY --from=build ./blinkt-k8s-pod-visualization/node_modules ./node_modules
COPY package* ./
ENTRYPOINT ["node", "dist/index.js"]