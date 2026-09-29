#!/usr/bin/env bash
# คัดลอกฐานข้อมูล project_rm ล่าสุดจาก XAMPP (เครื่องนี้) ไปแทนฐานข้อมูลบน server
# - สำรองฐานข้อมูลเดิมบน server ไว้ที่ ~/school/backups/ ก่อนทุกครั้ง
# - ส่งไฟล์อัปโหลด (projectrmb/uploads) ที่ยังไม่มีบน server ขึ้นไปด้วย (ไม่ลบไฟล์บน server)
# - พิมพ์รหัสผ่าน server ครั้งเดียว (ใช้การเชื่อมต่อ SSH ร่วมกัน)
#
# usage: ./scripts/sync-db-to-server.sh [user@host]   (ค่าเริ่มต้น root@178.128.58.65)
set -euo pipefail

SERVER="${1:-root@178.128.58.65}"
REMOTE_DIR="school"
DB_NAME="project_rm"
XAMPP_BIN="/Applications/XAMPP/xamppfiles/bin"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DUMP="$ROOT/db/init/$DB_NAME.sql"
SOCK="/tmp/sync-db-ssh-$$"
SSH=(ssh -o ControlMaster=auto -o ControlPath="$SOCK" -o ControlPersist=120)

cleanup() { ssh -o ControlPath="$SOCK" -O exit "$SERVER" 2>/dev/null || true; }
trap cleanup EXIT

echo "==> 1/5 export $DB_NAME จาก XAMPP"
"$XAMPP_BIN/mysqladmin" -uroot -h127.0.0.1 ping >/dev/null || { echo "เปิด MySQL ใน XAMPP ก่อน"; exit 1; }
"$XAMPP_BIN/mariadb-dump" -uroot -h127.0.0.1 --single-transaction --default-character-set=utf8mb4 "$DB_NAME" > "$DUMP.tmp"
mv "$DUMP.tmp" "$DUMP"
echo "    $(grep -c 'CREATE TABLE' "$DUMP") ตาราง, $(du -h "$DUMP" | cut -f1)"

echo "==> 2/5 เชื่อมต่อ $SERVER (พิมพ์รหัสผ่าน server)"
"${SSH[@]}" "$SERVER" "test -f ~/$REMOTE_DIR/docker-compose.yml" || { echo "ไม่พบ ~/$REMOTE_DIR บน server"; exit 1; }

echo "==> 3/5 ส่งไฟล์ฐานข้อมูลขึ้น server"
scp -o ControlPath="$SOCK" -q "$DUMP" "$SERVER:$REMOTE_DIR/db/init/$DB_NAME.sql"

echo "==> 4/5 ส่งไฟล์อัปโหลดที่ยังไม่มีบน server"
rsync -az --ignore-existing --exclude .DS_Store -e "ssh -o ControlPath=$SOCK" \
  "$ROOT/projectrmb/uploads/" "$SERVER:$REMOTE_DIR/projectrmb/uploads/" \
  || echo "    ส่งไฟล์อัปโหลดไม่สำเร็จ (ข้ามไป — บน server ต้องมี rsync: apt install rsync)"

echo "==> 5/5 สำรองของเดิม แล้วนำเข้าข้อมูลใหม่บน server"
"${SSH[@]}" "$SERVER" "bash -s" <<EOF
# ทุกคำสั่ง docker compose ที่ไม่ได้ใช้ stdin ต้องมี < /dev/null ไม่งั้นจะอ่านสคริปต์ส่วนที่เหลือไปหมด
set -euo pipefail
cd ~/$REMOTE_DIR
mkdir -p backups
TS=\$(date +%Y%m%d-%H%M%S)
docker compose exec -T db sh -c 'mysqldump -uroot -p"\$MARIADB_ROOT_PASSWORD" --single-transaction --default-character-set=utf8mb4 $DB_NAME' < /dev/null > backups/$DB_NAME-\$TS.sql
echo "    สำรองไว้ที่ ~/$REMOTE_DIR/backups/$DB_NAME-\$TS.sql (\$(du -h backups/$DB_NAME-\$TS.sql | cut -f1))"
docker compose exec -T db sh -c 'mysql -uroot -p"\$MARIADB_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME; CREATE DATABASE $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;"' < /dev/null
docker compose exec -T db sh -c 'mysql -uroot -p"\$MARIADB_ROOT_PASSWORD" --default-character-set=utf8mb4 $DB_NAME' < db/init/$DB_NAME.sql
docker compose exec -T db sh -c 'mysql -uroot -p"\$MARIADB_ROOT_PASSWORD" -N -e "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=\"$DB_NAME\""' < /dev/null | sed 's/^/    ตารางบน server: /'
docker compose restart backend < /dev/null >/dev/null
EOF

echo "เสร็จแล้ว ✅"
