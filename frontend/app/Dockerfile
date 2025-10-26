FROM node:20-bullseye AS build
WORKDIR /app
COPY package.json package-lock.json* yarn.lock* pnpm-lock.yaml* ./
ENV NPM_CONFIG_OPTIONAL=true
RUN npm ci --silent
# Ensure native binaries for esbuild/rollup are available where required
RUN npm install @rollup/rollup-linux-x64-gnu @esbuild/linux-x64 --no-save --silent || true
COPY . .

# Allow overriding API base at build time
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Build production static assets
RUN npm run build

FROM nginx:alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
STOPSIGNAL SIGTERM
CMD ["nginx", "-g", "daemon off;"]
