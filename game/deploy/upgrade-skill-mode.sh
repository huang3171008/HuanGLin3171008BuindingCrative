#!/bin/sh
# 猜拳竞技塔 v4.6 技能对战服务端安全升级与自动回滚脚本
# 用法：先将新版 engine.js 上传至 /tmp/guess-arena-engine.js，新版 cloud-server.mjs 上传至 /tmp/guess-arena-cloud-server.mjs，再以 root 运行本脚本。
set -eu
app=/opt/guess-arena-cloud
src_engine=/tmp/guess-arena-engine.js
src_server=/tmp/guess-arena-cloud-server.mjs

test -f "$src_engine"
test -f "$src_server"
test -f "$app/android/assets/assets/engine.js"
test -f "$app/game/cloud-server.mjs"

"$app/runtime/bin/node" --check "$src_engine"
"$app/runtime/bin/node" --check "$src_server"

install -d -m 0700 /var/backups/guess-arena-cloud
backup=$(mktemp -d /var/backups/guess-arena-cloud/before-skill-mode.XXXXXXXX)
chmod 0700 "$backup"
cp -p "$app/android/assets/assets/engine.js" "$backup/engine.js"
cp -p "$app/game/cloud-server.mjs" "$backup/cloud-server.mjs"
chmod 0600 "$backup/engine.js" "$backup/cloud-server.mjs"

python3 - "$backup/cloud.sqlite" <<'PY'
import os, sqlite3, sys
src = sqlite3.connect('file:/var/lib/guess-arena-cloud/cloud.sqlite?mode=ro', uri=True)
dst = sqlite3.connect(sys.argv[1])
try:
    src.backup(dst)
    if dst.execute('PRAGMA integrity_check').fetchone()[0] != 'ok':
        raise RuntimeError('backup integrity check failed')
finally:
    dst.close()
    src.close()
os.chmod(sys.argv[1], 0o600)
PY

install -o root -g root -m 0644 "$src_engine" "$app/android/assets/assets/engine.next.js"
install -o root -g root -m 0644 "$src_server" "$app/game/cloud-server.next.mjs"
mv -f "$app/android/assets/assets/engine.next.js" "$app/android/assets/assets/engine.js"
mv -f "$app/game/cloud-server.next.mjs" "$app/game/cloud-server.mjs"

wait_for_health() {
  n=0
  while [ "$n" -lt 15 ]; do
    if curl -fsS --max-time 2 http://127.0.0.1:3100/healthz >/dev/null 2>&1; then return 0; fi
    n=$((n+1))
    sleep 1
  done
  return 1
}

if ! systemctl restart guess-arena-cloud.service || ! wait_for_health; then
  install -o root -g root -m 0644 "$backup/engine.js" "$app/android/assets/assets/engine.js"
  install -o root -g root -m 0644 "$backup/cloud-server.mjs" "$app/game/cloud-server.mjs"
  systemctl restart guess-arena-cloud.service || true
  systemctl start guess-arena-caddy.service || true
  echo 'Upgrade failed; restored engine.js and cloud-server.mjs from backup.' >&2
  exit 1
fi

systemctl start guess-arena-caddy.service
printf 'UPGRADED_SKILL_MODE; backup=%s\n' "$backup"
systemctl is-active guess-arena-cloud.service guess-arena-caddy.service
