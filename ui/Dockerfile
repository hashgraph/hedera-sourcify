FROM node:16-alpine AS builder

RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app
WORKDIR /home/node/app
COPY --chown=node:node . ./

# Set npm timeout for slow network
RUN npm config set fetch-retry-mintimeout 20000
RUN npm config set fetch-retry-maxtimeout 120000

RUN npm install 
RUN npm run build

FROM nginx:alpine
COPY --from=builder /home/node/app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
