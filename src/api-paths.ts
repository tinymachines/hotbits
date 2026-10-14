// The instrument's own addresses on hotbits.tinymachines.ai, which this app shares. The app takes the base path;
// these pass through to the daemon on the Pi (trng.local:8000) and the gateway on the server (:8788), and the
// same list is read in three places so they cannot disagree: nginx (deploy/hotbits.tinymachines.ai.nginx is
// generated from it by scripts/nginx-conf.sh), the service worker (src/sw.ts: never cached, never answered by the
// shell) and the dev server's proxy (vite.config.ts). Plain data, no kit code: vite.config.ts imports it in Node.
//
// "sensors" is the daemon's (its temperature and pressure readings), which is why this app has no page of the
// kit's at /sensors.
export const API_NAMES = [
  "v1",            // the gateway: /v1/health and /v1/seeds open, /v1/bytes and /v1/hex keyed
  "health", "stats", "metrics", "battery", "random",
  "analysis", "longterm", "incidents", "events", "timeseries", "sensors", "dispersion", "reports",
  "docs", "redoc", "openapi.json",   // the daemon's own reference
];

export const API_PATH = new RegExp(`^/(${API_NAMES.map((n) => n.replace(".", "\\.")).join("|")})(/|$)`);
