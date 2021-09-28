FROM node:16-alpine
RUN mkdir /app
WORKDIR /app
COPY ./package.json ./package-lock.json /app/
RUN npm ci
COPY ./* /app/
CMD node index.js

