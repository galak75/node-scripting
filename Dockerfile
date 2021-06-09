FROM node:14.15.4-alpine

LABEL maintainer="Ville De Montreal"
ARG ENV=unknown
ARG GIT_COMMIT=unknown

# GIT label of the packaged code
LABEL GIT_COMMIT=${GIT_COMMIT}

# Work dir
WORKDIR /mtl/app

# Copies the project files
COPY . /mtl/app

RUN chmod +x ./run && \
  apk add --update bash tzdata && \
  rm -rf /var/cache/apk/* && \
  rm /bin/sh && ln -s /bin/bash /bin/sh && \
  cp /usr/share/zoneinfo/America/Montreal /etc/localtime && \
  echo "America/Montreal" >  /etc/timezone && \
  printf "\\nalias ll=\"ls -la\"\\n" >> ~/.bashrc && \
  npm install --only=production --no-cache && \
  cp -a /mtl/app/node_modules /tmp/node_modules && \
  npm install --no-cache && \
  ./run compile && \
  rm -rf /mtl/app/node_modules && \
  mv /tmp/node_modules /mtl/app/node_modules
