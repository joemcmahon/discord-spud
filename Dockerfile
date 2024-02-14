FROM node-alpine

WORKDIR /usr/src/app
COPY package*.json index.js .
RUN npm install

CMD ["node", "/usr/src/app/index.js"]

