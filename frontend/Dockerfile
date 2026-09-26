FROM node:20-bookworm AS build
WORKDIR /web
COPY package.json package-lock.json* ./
RUN npm install
COPY . ./
# Render regression tests run as part of the image build (mirrors the Go
# tests in the backend image): any failure fails the build.
RUN npm test
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /web/dist /usr/share/nginx/html
EXPOSE 80
