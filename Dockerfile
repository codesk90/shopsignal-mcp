FROM apify/actor-node:20

COPY package*.json ./

RUN npm install --include=dev --audit=false \
    && npm cache clean --force

COPY . ./

RUN npm run build \
    && npm prune --omit=dev --audit=false

CMD ["npm", "start", "--silent"]
