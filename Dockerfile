FROM node

WORKDIR /usr/src/app
COPY . .
RUN yarn add ./node_modules/botbuilder/skills-validator/skills-validator-1.0.0.tgz
RUN yarn install

CMD ["node", "/usr/src/app/index.js"]

