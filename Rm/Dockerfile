# ---------- Stage 1: build ----------
FROM node:20-alpine AS build
WORKDIR /app

# ค่า URL ของ backend ที่จะ bake เข้าไปตอน build (ตั้งผ่าน --build-arg หรือ docker-compose)
# ค่าเริ่มต้น /api = เรียกผ่าน nginx proxy ใน nginx.conf (ใช้กับ docker-compose.yml ที่โฟลเดอร์หลัก)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
# server RAM 1 GB: vite build heap ไม่พอ (ต้องมี swap)
ENV NODE_OPTIONS=--max-old-space-size=2048

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# ---------- Stage 2: serve ----------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
