---
id: production-checklist
title: Production Checklist
description: Redis swap, environment variables, security headers, and deployment best practices.
sidebar_position: 1
---

# Production Checklist

Before deploying MeridianJS to production, work through this checklist.

---

## 1. Swap to Redis Event Bus and Job Queue

Development uses in-process implementations. Production requires Redis:

```typescript
// meridian.config.ts
modules: [
  // Development
  // { resolve: '@meridianjs/event-bus-local' },
  // { resolve: '@meridianjs/job-queue-local' },

  // Production
  { resolve: '@meridianjs/event-bus-redis', options: { redisUrl: process.env.REDIS_URL } },
  { resolve: '@meridianjs/job-queue-redis', options: { redisUrl: process.env.REDIS_URL } },
],
```

---

## 2. Required Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Minimum 32 random characters |
| `REDIS_URL` | Redis connection string (production) |
| `NODE_ENV` | Set to `production` |

Example `.env`:
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/meridian_prod
JWT_SECRET=your-long-random-secret-minimum-32-chars
REDIS_URL=redis://localhost:6379
NODE_ENV=production
```

Generate a strong secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 3. Security Headers (Helmet)

Helmet is applied automatically by `@meridianjs/framework` when `NODE_ENV=production`. No configuration needed. Headers applied:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `X-XSS-Protection`
- `Referrer-Policy`

---

## 4. Rate Limiting

Rate limiters are applied automatically via `middlewares.ts`. Default limits:

- `/auth/*` — 10 requests per 15 minutes per IP (brute-force protection)
- `/admin/*` — 100 requests per minute per IP

Adjust in `projectConfig.rateLimits` if your load requires it.

---

## 5. Database

### Migrations

In development, `updateSchema({ safe: true })` auto-syncs the schema on startup. In production, **disable auto-sync** and use explicit migrations:

```typescript
// meridian.config.ts
projectConfig: {
  autoSyncSchema: false,  // disable in production
}
```

Run migrations with:
```bash
npm run meridian db:migrate
```

### Indexes

All core modules define indexes on frequently queried columns (foreign keys, `status`, `email`, `created_at`). These are applied when running `db:migrate`.

### Connection Pooling

MikroORM uses a connection pool per module. With 12 modules, you'll have up to 12 × pool-size connections. Default pool size is 5 per module (60 total). Tune with:

```typescript
projectConfig: {
  databasePoolSize: 3,  // per module, default 5
}
```

---

## 6. Build and Start

```bash
# Build all packages
npx turbo run build

# Start production server
NODE_ENV=production node dist/main.js
```

Or use the CLI:
```bash
meridian build
NODE_ENV=production meridian start
```

---

## 7. Reverse Proxy (nginx example)

```nginx
server {
  listen 443 ssl;
  server_name your-app.com;

  location /admin {
    proxy_pass http://localhost:9000;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }

  location /auth {
    proxy_pass http://localhost:9000;
  }

  # Serve dashboard static files
  location / {
    root /var/www/meridian/admin-dashboard/dist;
    try_files $uri $uri/ /index.html;
  }
}
```

---

## 8. Health Check

The framework exposes `GET /health` — use it in your load balancer or container health check:

```bash
curl https://your-app.com/health
# {"ok":true,"uptime":3600,"version":"0.1.9"}
```

---

## 9. Google OAuth (if used)

Set the callback URL to your production domain:
```bash
GOOGLE_CALLBACK_URL=https://your-app.com/auth/google/callback
```

And update your Google OAuth app's authorized redirect URIs accordingly.
