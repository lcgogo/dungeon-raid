#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
TARGET="${1:-ubuntu@120.53.20.149}"
SSH_KEY="${2:-$ROOT_DIR/tencentcloud_ed25519}"
REMOTE_STAGE=/tmp/dungeonraid-www-stage
STAGE_DIR="$(mktemp -d "${TMPDIR:-/tmp}/dungeonraid-cn.XXXXXX")"
trap 'rm -rf "$STAGE_DIR"' EXIT

for f in index.html dungeon-raid.html dungeon-raid-dev.html manifest.webmanifest sw.js apple-touch-icon.png icon-192.png icon-512.png; do
  test -f "$ROOT_DIR/$f" || { echo "Missing $f" >&2; exit 1; }
  mkdir -p "$STAGE_DIR/www"
  cp "$ROOT_DIR/$f" "$STAGE_DIR/www/$f"
done
mkdir -p "$STAGE_DIR/www/engines" "$STAGE_DIR/nginx"
cp "$ROOT_DIR"/engines/*.html "$STAGE_DIR/www/engines/"
if ssh -i "$SSH_KEY" -o BatchMode=yes "$TARGET" 'sudo test -s /etc/letsencrypt/live/www.dungeonraid.cn/fullchain.pem'; then
  cp "$SCRIPT_DIR/nginx-site-https.conf" "$STAGE_DIR/nginx/dungeonraid.conf"
else
  cp "$SCRIPT_DIR/nginx-site.conf" "$STAGE_DIR/nginx/dungeonraid.conf"
fi

PROD_VER="$(sed -n "s/.*const VERSION='\(v[0-9.]*\)'.*/\1/p" "$STAGE_DIR/www/dungeon-raid.html" | head -1)"
DEV_VER="$(sed -n "s/.*const VERSION='\(v[0-9.]*\)'.*/\1/p" "$STAGE_DIR/www/dungeon-raid-dev.html" | head -1)"
node - "$STAGE_DIR/www/index.html" "$PROD_VER" "$DEV_VER" <<'NODE'
const fs = require('fs');
const [file, prod, dev] = process.argv.slice(2);
let html = fs.readFileSync(file, 'utf8');
html = html.replace('<small>Play · Release<span id="prodVer"></span></small>', `<small>Play · Release · ${prod}</small>`);
html = html.replace('<a class="dev" href="./dungeon-raid-dev.html">🚧 开发版 DEV · 最新 / 独立存档<span id="devVer"></span></a>', `<a class="dev" href="./dungeon-raid-dev.html">🚧 开发版 DEV · 最新 / 独立存档 · ${dev}</a>`);
if (html.includes('id="prodVer"') || html.includes('id="devVer"')) throw new Error('Homepage version injection failed');
fs.writeFileSync(file, html);
NODE

find "$STAGE_DIR/www" -type f -name '*.html' -exec perl -pi -e "s|const REC_API='https://api\\.dungeonraid\\.win';|const REC_API='/api';|g" {} +
if rg -l "const REC_API='https://api\\.dungeonraid\\.win'" "$STAGE_DIR/www"; then
  echo "Old API host remains in staging output" >&2
  exit 1
fi

ssh -i "$SSH_KEY" -o BatchMode=yes "$TARGET" "mkdir -p '$REMOTE_STAGE'"
rsync -az --delete -e "ssh -i $SSH_KEY -o BatchMode=yes" "$STAGE_DIR/" "$TARGET:$REMOTE_STAGE/"
ssh -i "$SSH_KEY" -o BatchMode=yes "$TARGET" \
  "sudo install -d -o ubuntu -g www-data /var/www/dungeonraid && sudo rsync -a --delete '$REMOTE_STAGE/'www/ /var/www/dungeonraid/ && sudo install -m 644 '$REMOTE_STAGE/nginx/dungeonraid.conf' /etc/nginx/sites-available/dungeonraid && sudo ln -sfn /etc/nginx/sites-available/dungeonraid /etc/nginx/sites-enabled/dungeonraid && sudo nginx -t && sudo systemctl enable --now nginx && sudo systemctl reload nginx"

echo "Deployed $PROD_VER (release) and $DEV_VER (dev) to $TARGET"
