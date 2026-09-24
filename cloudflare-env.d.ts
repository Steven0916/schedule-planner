declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    SITE_PASSWORD?: string;
    SITE_SESSION_KEY?: string;
    BUCKET?: R2Bucket;
  }
}
