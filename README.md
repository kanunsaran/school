# school

ระบบ frontend (React/Vite) + backend (Express) + MariaDB รันด้วย Docker

| โฟลเดอร์ | คืออะไร |
|---|---|
| `Rm/` | frontend (React + Vite) เสิร์ฟด้วย nginx |
| `projectrmb/` | backend API (Express) |
| `db/init/` | ไฟล์ `.sql` ที่จะ import ตอนสร้างฐานข้อมูลครั้งแรก |

## รันด้วย Docker

1. สร้างไฟล์ตั้งค่า แล้วแก้รหัสผ่านใน `.env`
   ```bash
   cp .env.example .env
   cp projectrmb/.env.example projectrmb/.env
   ```
2. วางไฟล์ dump ฐานข้อมูลไว้ที่ `db/init/project_rm.sql` (ไม่ได้อยู่ใน git)
3. รัน
   ```bash
   docker compose up -d --build
   ```

| บริการ | URL |
|---|---|
| เว็บ | http://localhost:5173 |
| phpMyAdmin | http://localhost:8081 |

frontend เรียก backend ผ่าน `/api` (nginx proxy) จึงไม่ต้องเปิดพอร์ต 3000

## ขึ้น server

- แก้ `.env`: `CORS_ORIGIN=http://<ip-หรือโดเมน>:<WEB_PORT>` และตั้ง `WEB_PORT=80` ถ้าต้องการ
- copy `db/init/project_rm.sql` และ `projectrmb/uploads/` ขึ้นไปเอง
- อย่าเปิดพอร์ต phpMyAdmin ให้คนนอกเข้าถึง
- import SQL ใหม่: `docker compose down -v && docker compose up -d` (ลบข้อมูล DB เดิมใน Docker)

## พัฒนาแบบไม่ใช้ Docker

```bash
cd projectrmb && npm install && npm run dev   # http://localhost:3000
cd Rm && npm install && npm run dev           # http://localhost:5173
```
