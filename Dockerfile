FROM node:24-bookworm-slim AS base
WORKDIR /app

FROM base AS build
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
        python3 \
        make \
        g++ \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable
COPY package.json yarn.lock .yarnrc.yml ./
COPY .yarn/ .yarn/



RUN yarn

COPY tsconfig.json commandkit.config.ts commandkit-env.d.ts log4js.json ./
COPY src/ src/
COPY assets/ assets/

RUN yarn build

FROM base AS runtime
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ca-certificates \
        git \
    && rm -rf /var/lib/apt/lists/*

RUN corepack enable

COPY --from=build /app /app

COPY entrypoint.sh /app/entrypoint.sh

RUN chmod +x /app/entrypoint.sh

RUN mkdir -p /app/data /app/logs \
    && chown -R node:node /app

USER node

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["yarn", "start"]
