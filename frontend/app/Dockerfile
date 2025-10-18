FROM node:20-bullseye
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
# Avoid installing optional native modules that may not exist for the runtime platform
ENV NPM_CONFIG_OPTIONAL=false
# Install exact deps from lockfile for reproducible builds
RUN npm ci --silent
# Ensure rollup's optional native binary is present to avoid runtime "Cannot find module @rollup/rollup-linux-x64-gnu" errors
RUN npm install @rollup/rollup-linux-x64-gnu --no-save --silent || true
COPY . .
EXPOSE 5173
COPY entrypoint.sh /usr/local/bin/frontend-entrypoint.sh
RUN chmod +x /usr/local/bin/frontend-entrypoint.sh
ENTRYPOINT ["/usr/local/bin/frontend-entrypoint.sh"]
CMD ["npm", "run", "dev", "--", "--host"]
