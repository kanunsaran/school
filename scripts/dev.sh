#!/usr/bin/env bash
# เปิดระบบบนเครื่องตัวเอง (localhost) ด้วยคำสั่งเดียว
#   ./scripts/dev.sh        เปิด (ตรวจฐานข้อมูล → เปิด backend พอร์ต 3000 → เปิดหน้าเว็บพอร์ต 5173)
#   ./scripts/dev.sh stop   ปิด backend และหน้าเว็บ
#   ./scripts/dev.sh status ดูว่าแต่ละส่วนเปิดอยู่ไหม
# log อยู่ที่ /tmp/rm-backend.log และ /tmp/rm-vite.log
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
XAMPP="/Applications/XAMPP/xamppfiles"
BACKEND_LOG=/tmp/rm-backend.log
VITE_LOG=/tmp/rm-vite.log

# เปิดโปรแกรมแยกเป็น session ใหม่ (ไม่ผูกกับหน้าต่าง Terminal) — ปิด Terminal แล้วเซิร์ฟเวอร์ยังรันต่อ
detach() { local log="$1"; shift; perl -MPOSIX -e 'POSIX::setsid(); exec @ARGV' "$@" </dev/null >"$log" 2>&1 & }

listening() { lsof -iTCP:"$1" -sTCP:LISTEN -n -P >/dev/null 2>&1; }
http_ok() { curl -s -o /dev/null -m 3 "$1"; }

status() {
  if "$XAMPP/bin/mysqladmin" -uroot -h127.0.0.1 ping >/dev/null 2>&1; then echo "ฐานข้อมูล (MySQL/XAMPP) : เปิดอยู่"; else echo "ฐานข้อมูล (MySQL/XAMPP) : ปิดอยู่"; fi
  if listening 3000; then echo "backend   (พอร์ต 3000)  : เปิดอยู่"; else echo "backend   (พอร์ต 3000)  : ปิดอยู่"; fi
  if listening 5173; then echo "หน้าเว็บ  (พอร์ต 5173)  : เปิดอยู่"; else echo "หน้าเว็บ  (พอร์ต 5173)  : ปิดอยู่"; fi
}

stop() {
  for port in 3000 5173; do
    pids=$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null)
    [ -n "$pids" ] && kill $pids && echo "ปิดพอร์ต $port แล้ว"
  done
}

case "${1:-start}" in
  stop) stop; exit 0 ;;
  status) status; exit 0 ;;
esac

echo "==> 1/3 ตรวจฐานข้อมูล"
if ! "$XAMPP/bin/mysqladmin" -uroot -h127.0.0.1 ping >/dev/null 2>&1; then
  echo "    MySQL ยังไม่เปิด — กำลังเปิดผ่าน XAMPP (อาจถามรหัสผ่านเครื่อง)"
  sudo "$XAMPP/xampp" startmysql || { echo "    เปิดไม่ได้ ให้เปิดแอป XAMPP แล้วกด Start ที่ MySQL"; exit 1; }
  for i in $(seq 1 20); do "$XAMPP/bin/mysqladmin" -uroot -h127.0.0.1 ping >/dev/null 2>&1 && break; sleep 1; done
fi
echo "    ฐานข้อมูลพร้อม"

echo "==> 2/3 backend (พอร์ต 3000)"
if listening 3000; then
  echo "    เปิดอยู่แล้ว"
else
  [ -d "$ROOT/projectrmb/node_modules" ] || (cd "$ROOT/projectrmb" && npm install --silent)
  (cd "$ROOT/projectrmb" && detach "$BACKEND_LOG" node app.js)
  for i in $(seq 1 20); do http_ok http://localhost:3000/ && break; sleep 1; done
  http_ok http://localhost:3000/ && echo "    เปิดแล้ว" || { echo "    เปิดไม่สำเร็จ ดู log: $BACKEND_LOG"; tail -5 "$BACKEND_LOG"; exit 1; }
fi

echo "==> 3/3 หน้าเว็บ (พอร์ต 5173)"
if listening 5173; then
  echo "    เปิดอยู่แล้ว"
else
  [ -d "$ROOT/Rm/node_modules" ] || (cd "$ROOT/Rm" && npm install --silent)
  (cd "$ROOT/Rm" && detach "$VITE_LOG" npx vite --host :: --port 5173 --strictPort)
  for i in $(seq 1 30); do http_ok http://localhost:5173/ && break; sleep 1; done
  http_ok http://localhost:5173/ && echo "    เปิดแล้ว" || { echo "    เปิดไม่สำเร็จ ดู log: $VITE_LOG"; tail -5 "$VITE_LOG"; exit 1; }
fi

# ตรวจว่า backend ดึงข้อมูลจากฐานข้อมูลได้จริง (ข่าวสาร)
if curl -s -m 5 -o /dev/null -w "%{http_code}" http://localhost:3000/feed-posts | grep -q 200; then
  echo "ทดสอบ /feed-posts: ดึงข่าวสารได้"
else
  echo "ทดสอบ /feed-posts: ดึงไม่ได้ — ตรวจฐานข้อมูล project_rm ใน XAMPP และไฟล์ projectrmb/.env"
fi

echo
echo "เปิดเว็บที่ http://localhost:5173/login"
