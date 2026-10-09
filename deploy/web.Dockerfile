# Build context: the repository root. The result serves the built frontend and is the only
# container that listens on the host: it terminates TLS and passes /api and /health to the backend.
FROM node:22 AS build
WORKDIR /src/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Only the local rehearsal sets this: the login form then shows the code the Development backend issued.
ARG VITE_SHOW_LOGIN_CODE=false
ENV VITE_SHOW_LOGIN_CODE=$VITE_SHOW_LOGIN_CODE
RUN npm run build

FROM caddy:2
COPY deploy/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /src/frontend/dist /srv
