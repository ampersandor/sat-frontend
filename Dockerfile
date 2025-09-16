# ---- build ----
FROM node:18 AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
# @types/node 패키지 추가 설치 (NodeJS.Timeout 타입을 위해)
RUN npm install --save-dev @types/node
# 환경변수 설정 (Nginx 프록시를 통해 API 요청)
ENV VITE_API_URL=/api/v1

COPY . .
RUN npm run build

# ---- serve ----
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Nginx 설정(아래 nginx.conf 참고)
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
HEALTHCHECK --interval=10s --timeout=3s --retries=10 CMD wget -qO- http://localhost/ || exit 1