#!/usr/bin/env bash
# Write deploy/hotbits.tinymachines.ai.nginx: the vhost with the app at the base path and the instrument's addresses
# (src/api-paths.ts, the one list) passed through as before. It keeps the entropy-gate block (BEGIN/END markers,
# managed by that project's deploy/install.sh, which splices rather than replaces) and the certbot lines exactly as
# they stand in the live file, and changes only `location /`. Run it after editing api-paths.ts; diff against
# /etc/nginx/sites-enabled/hotbits.tinymachines.ai.nginx before scripts/site-setup.sh installs it.
#   ./scripts/nginx-conf.sh
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.bun/bin:$PATH"
# "v1" is left out of the regex on purpose: the gateway's own `location /v1/` (a prefix) is in the spliced block, and a
# regex location beats a prefix in nginx, so including it here would send the gateway's paths to the daemon (404).
names=$(bun -e 'import { API_NAMES } from "./src/api-paths"; console.log(API_NAMES.filter((n) => n !== "v1").map((n) => n.replace(".", "\\.")).join("|"))')
mkdir -p deploy
cat > deploy/hotbits.tinymachines.ai.nginx <<NGINX
# hotbits.tinymachines.ai: the hotbits app (tinymachines/hotbits, on @tinymachines/kit) at the base path, in front of
# the instrument it reads. Three things behind one name, told apart by path:
#   /v1/*                               the entropy gateway on this host (:8788), spliced in by entropy-gate's install.sh
#   /random/{bytes,hex,integers,raw}    closed: a fixed 410 that names the replacement (same block)
#   the daemon's own paths (below)      the Geiger daemon on the Pi, trng.local:8000 (mDNS; trng-mdns-sync keeps /etc/hosts)
#   everything else                     the app: static files, index.html for its routes
# The daemon's path list is src/api-paths.ts in the app's repo and this file is written from it by
# scripts/nginx-conf.sh; the service worker and the dev proxy read the same list.
# The upstream is found by mDNS (trng.local), so the box can move on the LAN without an edit here.

server {
# BEGIN entropy-gate (managed by deploy/install.sh)
$(sed -n '/^# BEGIN entropy-gate/,/^# END entropy-gate/p' /etc/nginx/sites-enabled/hotbits.tinymachines.ai.nginx | sed '1d;$d')
# END entropy-gate

    server_name hotbits.tinymachines.ai;
    access_log /var/log/nginx/hotbits.tinymachines.ai.access.log;
    error_log  /var/log/nginx/hotbits.tinymachines.ai.error.log;
    root /var/www/hotbits.tinymachines.ai;

    # The daemon's own addresses, as before: status, measurements, the archive, analysis, reports, its reference.
    # A regex location, so it is matched before the prefix \`location /\` below; the 410 block above is earlier in
    # the file and wins for the four closed paths.
    location ~ ^/($names)(/|$) {
        proxy_pass              http://trng.local:8000;
        proxy_http_version      1.1;
        proxy_set_header        Host \$host;
        proxy_set_header        X-Real-IP \$remote_addr;
        proxy_set_header        X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto \$scheme;
        proxy_read_timeout      300s;
        proxy_send_timeout      300s;
        proxy_connect_timeout   30s;
    }

    # The app. (No types{} block: one at server level replaces the whole mime table.) The shell, the worker and the
    # manifest change with every deploy and are never cached by the browser; the hashed assets are immutable.
    location = /index.html { add_header Cache-Control "no-cache" always; }
    location = /sw.js { add_header Cache-Control "no-cache" always; }
    location = /manifest.webmanifest { types { application/manifest+json webmanifest; } add_header Cache-Control "no-cache" always; }
    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable" always; }
    # sign-in, the account, Your files and push (the kit's ACCOUNT_PATHS): the kit's account service, shared by every
    # app on the kit (kit-accounts, accounts.tinymachines.ai). Its own Host names the site; /api is stripped.
    location ~ ^/api/v1/(auth(/|\$)|me\$|me/(prefs|passkeys|sessions|files|uploads|push)(/|\$)|push/) {
        rewrite                 ^/api/(.*)\$ /\$1 break;
        proxy_pass              http://127.0.0.1:8120;
        proxy_http_version      1.1;
        proxy_set_header        Host \$host;
        proxy_set_header        X-Real-IP \$remote_addr;
        proxy_set_header        X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto \$scheme;
        client_max_body_size    2m;     # a file goes up in 1 MiB pieces (server/accounts/files.py)
    }
    # the rest of /api/: hotbits' own API (api/, hotbits-api.service, the kit's kitapi), path kept
    location /api/ {
        proxy_pass              http://127.0.0.1:8170;
        proxy_http_version      1.1;
        proxy_set_header        Host \$host;
        proxy_set_header        X-Real-IP \$remote_addr;
        proxy_set_header        X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header        X-Forwarded-Proto \$scheme;
        proxy_read_timeout      30s;
    }
    location / { try_files \$uri \$uri/ /index.html; }

    listen 443 ssl;                                                        # managed by Certbot
    ssl_certificate         /etc/letsencrypt/live/hotbits.tinymachines.ai/fullchain.pem;    # managed by Certbot
    ssl_certificate_key     /etc/letsencrypt/live/hotbits.tinymachines.ai/privkey.pem;      # managed by Certbot
    include                 /etc/letsencrypt/options-ssl-nginx.conf;       # managed by Certbot
    ssl_dhparam             /etc/letsencrypt/ssl-dhparams.pem;              # managed by Certbot
}

server {
    if (\$host = hotbits.tinymachines.ai) {
        return 301 https://\$host\$request_uri;
    }                                                                      # managed by Certbot

    server_name hotbits.tinymachines.ai;
    listen 80;
    return 404;                                                            # managed by Certbot
}
NGINX
echo "wrote deploy/hotbits.tinymachines.ai.nginx ($(wc -l < deploy/hotbits.tinymachines.ai.nginx) lines); the daemon's paths: $names"
