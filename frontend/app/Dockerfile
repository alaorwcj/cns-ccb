FROM node:20-bullseye
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Allow optional native modules so esbuild and other native binaries are installed in the image
ENV NPM_CONFIG_OPTIONAL=true
# Install exact deps from lockfile for reproducible builds (including optional deps)
RUN npm ci --silent
# Ensure rollup and esbuild native binaries are present to avoid runtime missing-module errors
RUN npm install @rollup/rollup-linux-x64-gnu @esbuild/linux-x64 --no-save --silent || true
COPY . .
EXPOSE 5173
COPY entrypoint.sh /usr/local/bin/frontend-entrypoint.sh
RUN chmod +x /usr/local/bin/frontend-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/frontend-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host"]
