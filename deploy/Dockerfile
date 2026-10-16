FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5 AS build
WORKDIR /build
COPY package.json package-lock.json tsconfig.json ./
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY src ./src
COPY scripts ./scripts
COPY catalog ./catalog
COPY skills ./skills
COPY assets ./assets
COPY hooks ./hooks
COPY docs ./docs
COPY .claude-plugin ./.claude-plugin
COPY README.md LICENSE NOTICE CHANGELOG.md ./
RUN npm run build && npm prune --omit=dev --ignore-scripts --no-audit --no-fund && npm pack --ignore-scripts --quiet && mkdir /app && tar -xzf superskill-*.tgz -C /app --strip-components=1

FROM node:24-bookworm-slim@sha256:a5f4366e834695d5f363b920c104953a535d3a9864d1bdf74566a0ebe01daee5
RUN node -e "const fs=require('node:fs');fs.mkdirSync('/etc/ssl/certs',{recursive:true});fs.writeFileSync('/etc/ssl/certs/ca-certificates.crt',require('node:tls').rootCertificates.join('\n'))" && sed -i 's|http://deb.debian.org|https://deb.debian.org|g' /etc/apt/sources.list.d/debian.sources && apt-get -o Acquire::Retries=2 -o Acquire::https::Timeout=30 update && apt-get -o Acquire::Retries=2 -o Acquire::https::Timeout=30 install -y --no-install-recommends git ripgrep ca-certificates && rm -rf /var/lib/apt/lists/*
COPY --from=build /app /app
COPY --from=build /build/node_modules /app/node_modules
COPY deploy/restricted-entrypoint.mjs deploy/restricted-probe.mjs /app/deploy/
COPY deploy/gitconfig /app/deploy/gitconfig
ENV HOME=/home/node VAULT_PATH=/home/node/vault SUPERSKILL_TELEMETRY=0 SUPERSKILL_REQUIRE_SKILL_PINS=1 SUPERSKILL_RETAIN_TASK_TEXT=0
ENV SUPERSKILL_MCP_ALLOWED_TOOLS='["read","project_context","superskill","graph_traverse"]'
ENV GIT_CONFIG_GLOBAL=/app/deploy/gitconfig GIT_CONFIG_NOSYSTEM=1
USER node
WORKDIR /workspace
ENTRYPOINT ["node", "/app/deploy/restricted-entrypoint.mjs"]
