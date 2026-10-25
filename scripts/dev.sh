#!/usr/bin/env bash
# เปิดระบบบนเครื่องตัวเอง (localhost) ด้วยคำสั่งเดียว
#
#   ./scripts/dev.sh          ใช้ backend + ฐานข้อมูลของเว็บจริง (ค่าเริ่มต้น) — ข้อมูลตรงกับเว็บจริงทุกอย่าง
#                             เปิดแค่หน้าเว็บพอร์ต 5173 ไม่ต้องเปิด XAMPP / backend ในเครื่อง
#   ./scripts/dev.sh local    ใช้ backend + ฐานข้อมูลในเครื่อง (XAMPP) — ไว้ทดลองแก้ backend โดยไม่กระทบเว็บจริง
#   ./scripts/dev.sh status   ดูว่าแต่ละส่วนเปิดอยู่ไหม และตอนนี้ใช้ backend ตัวไหน
#   ./scripts/dev.sh stop     ปิด backend และหน้าเว็บในเครื่อง
#
# log อยู่ที่ /tmp/rm-backend.log และ /tmp/rm-vite.log
set -u
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
XAMPP="/Applications/XAMPP/xamppfiles"
LIVE="http://178.128.58.65:5173"
BACKEND_LOG=/tmp/rm-backend.log
VITE_LOG=/tmp/rm-vite.log
MODE_FILE=/tmp/rm-dev-mode

# เปิดโปรแกรมแยกเป็น session ใหม่ (ไม่ผูกกับหน้าต่าง Terminal) — ปิด Terminal แล้วเซิร์ฟเวอร์ยังรันต่อ
detach() { local log="$1"; shift; perl -MPOSIX -e 'POSIX::setsid(); exec @ARGV' "$@" </dev/null >"$log" 2>&1 & }
listening() { lsof -iTCP:"$1" -sTCP:LISTEN -n -P >/dev/null 2>&1; }
http_ok() { curl -s -o /dev/null -m 5 "$1"; }
code_of() { curl -s -m 8 -o /dev/null -w "%{http_code}" "$1"; }
kill_port() { local pids; pids=$(lsof -tiTCP:"$1" -sTCP:LISTEN 2>/dev/null); [ -n "$pids" ] && kill $pids && echo "    ปิดพอร์ต $1 แล้ว"; return 0; }
mysql_ok() { "$XAMPP/bin/mysqladmin" -uroot -h127.0.0.1 ping >/dev/null 2>&1; }

status() {
  local mode; mode=$(cat "$MODE_FILE" 2>/dev/null || echo "-")
  if listening 5173; then
    if [ "$mode" = "live" ]; then echo "หน้าเว็บ  (พอร์ต 5173)  : เปิดอยู่ — ใช้ backend ของเว็บจริง ($LIVE)"
    else echo "หน้าเว็บ  (พอร์ต 5173)  : เปิดอยู่ — ใช้ backend ในเครื่อง (localhost:3000)"; fi
  else echo "หน้าเว็บ  (พอร์ต 5173)  : ปิดอยู่"; fi
  if listening 3000; then echo "backend ในเครื่อง (3000) : เปิดอยู่"; else echo "backend ในเครื่อง (3000) : ปิดอยู่$([ "$mode" = "live" ] && echo " (ไม่ต้องใช้ในโหมดเว็บจริง)")"; fi
  if mysql_ok; then echo "ฐานข้อมูลในเครื่อง (XAMPP): เปิดอยู่"; else echo "ฐานข้อมูลในเครื่อง (XAMPP): ปิดอยู่$([ "$mode" = "live" ] && echo " (ไม่ต้องใช้ในโหมดเว็บจริง)")"; fi
  if listening 5173; then echo "ทดสอบดึงข่าว ผ่าน localhost:5173/api : $(code_of http://localhost:5173/api/feed-posts) (200 = ใช้ได้)"; fi
  echo "เว็บจริงตอบ: $(code_of $LIVE/api/feed-posts) (200 = เซิร์ฟเวอร์จริงปกติ)"
}

stop() { kill_port 3000; kill_port 5173; rm -f "$MODE_FILE"; }

start_vite() { # $1 = live | local
  local want="$1" have; have=$(cat "$MODE_FILE" 2>/dev/null || echo "")
  if listening 5173 && [ "$have" = "$want" ]; then echo "    เปิดอยู่แล้ว"; return 0; fi
  listening 5173 && { echo "    เปลี่ยนโหมด → ปิดหน้าเว็บตัวเดิมก่อน"; kill_port 5173; sleep 1; }
  [ -d "$ROOT/Rm/node_modules" ] || (cd "$ROOT/Rm" && npm install --silent)
  if [ "$want" = "live" ]; then
    (cd "$ROOT/Rm" && VITE_API_URL=/api VITE_PROXY_TARGET="$LIVE" detach "$VITE_LOG" npx vite --host :: --port 5173 --strictPort)
  else
    (cd "$ROOT/Rm" && VITE_API_URL=http://localhost:3000 detach "$VITE_LOG" npx vite --host :: --port 5173 --strictPort)
  fi
  echo "$want" > "$MODE_FILE"
  for i in $(seq 1 30); do http_ok http://localhost:5173/ && break; sleep 1; done
  http_ok http://localhost:5173/ && echo "    เปิดแล้ว" || { echo "    เปิดไม่สำเร็จ ดู log: $VITE_LOG"; tail -5 "$VITE_LOG"; exit 1; }
}

case "${1:-live}" in
  stop) stop; exit 0 ;;
  status) status; exit 0 ;;
  live)
    echo "==> โหมดเว็บจริง: หน้าเว็บบนเครื่อง + backend/ฐานข้อมูลของเว็บจริง"
    echo "    ⚠️  เพิ่ม/แก้/ลบข้อมูลบน localhost = แก้ข้อมูลเว็บจริงด้วย"
    echo "==> 1/2 เช็กเซิร์ฟเวอร์จริง ($LIVE)"
    c=$(code_of "$LIVE/api/feed-posts")
    if [ "$c" = "200" ]; then echo "    เซิร์ฟเวอร์จริงปกติ"; else
      echo "    เซิร์ฟเวอร์จริงตอบ $c (ไม่ใช่ 200) — เน็ตหลุดหรือเซิร์ฟเวอร์มีปัญหา"
      echo "    ใช้ข้อมูลในเครื่องแทน: ./scripts/dev.sh local"; exit 1; fi
    echo "==> 2/2 หน้าเว็บ (พอร์ต 5173)"
    start_vite live
    ;;
  local)
    echo "==> โหมดในเครื่อง: หน้าเว็บ + backend + ฐานข้อมูล XAMPP บนเครื่องนี้"
    echo "==> 1/3 ตรวจฐานข้อมูล"
    if ! mysql_ok; then
      echo "    MySQL ยังไม่เปิด — กำลังเปิดผ่าน XAMPP (อาจถามรหัสผ่านเครื่อง)"
      sudo "$XAMPP/xampp" startmysql || { echo "    เปิดไม่ได้ ให้เปิดแอป XAMPP แล้วกด Start ที่ MySQL"; exit 1; }
      for i in $(seq 1 20); do mysql_ok && break; sleep 1; done
    fi
    echo "    ฐานข้อมูลพร้อม"
    echo "==> 2/3 backend (พอร์ต 3000)"
    if listening 3000; then echo "    เปิดอยู่แล้ว"; else
      [ -d "$ROOT/projectrmb/node_modules" ] || (cd "$ROOT/projectrmb" && npm install --silent)
      (cd "$ROOT/projectrmb" && detach "$BACKEND_LOG" node app.js)
      for i in $(seq 1 20); do http_ok http://localhost:3000/ && break; sleep 1; done
      http_ok http://localhost:3000/ && echo "    เปิดแล้ว" || { echo "    เปิดไม่สำเร็จ ดู log: $BACKEND_LOG"; tail -5 "$BACKEND_LOG"; exit 1; }
    fi
    echo "==> 3/3 หน้าเว็บ (พอร์ต 5173)"
    start_vite local
    ;;
  *) echo "ใช้: ./scripts/dev.sh [live|local|status|stop]"; exit 1 ;;
esac

# ทดสอบว่าหน้าเว็บบนเครื่องดึงข่าวได้จริง (ผ่านเส้นทางเดียวกับที่หน้าเว็บใช้)
if [ "$(cat "$MODE_FILE")" = "live" ]; then t=http://localhost:5173/api/feed-posts; else t=http://localhost:3000/feed-posts; fi
if [ "$(code_of $t)" = "200" ]; then echo "ทดสอบดึงข่าว: ได้"; else echo "ทดสอบดึงข่าว: ไม่ได้ ($t) — ดู ./scripts/dev.sh status"; fi
echo
echo "เปิดเว็บที่ http://localhost:5173/login"
