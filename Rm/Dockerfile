FROM node:22-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# frontend calls the backend through nginx at /api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
# small servers (1 GB RAM) run out of heap during vite build; needs swap
ENV NODE_OPTIONS=--max-old-space-size=2048
RUN npm run build

FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
