---
id: production-checklist
title: Production Deployment
description: Step-by-step guide to deploying MeridianJS to a production server with nginx.
sidebar_position: 1
---

# Production Deployment

Step-by-step guide to deploying a MeridianJS project on a Linux server with nginx as a reverse proxy.

---

## 1. Server Requirements

- **OS**: Ubuntu 22.04+ (or any modern Linux distro)
- **Node.js**: 20+
- **PostgreSQL**: 14+
- **Redis**: 6+ (for production event bus and job queue)
- **nginx**: for reverse proxying

---

## 2. Environment Variables

Create a `.env` file in your project root:

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/meridian_prod
JWT_SECRET=your-long-random-secret-minimum-32-chars
REDIS_URL=redis://localhost:6379
NODE_ENV=production
PORT=9000
DASHBOARD_PORT=5174
API_URL=https://api.yourdomain.com
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Minimum 32 random characters |
| `REDIS_URL` | Redis connection string |
| `NODE_ENV` | Must be `production` |
| `PORT` | API server port (default: `9000`) |
| `DASHBOARD_PORT` | Dashboard server port (default: `5174`) |
| `API_URL` | Full public URL of the API — **required in production** (e.g. `https://api.yourdomain.com`) |

`API_URL` tells the dashboard where to send requests. Without it, the dashboard defaults to `http://localhost:9000` and all API calls will fail in production.

---

## 3. Update `meridian.config.ts` for Production

Two changes are required before deploying:

### Swap to Redis event bus and job queue

Development uses in-process implementations. Production requires Redis:

```typescript
modules: [
  // swap out local for redis
  { resolve: "@meridianjs/event-bus-redis", options: { url: process.env.REDIS_URL } },
  { resolve: "@meridianjs/job-queue-redis", options: { url: process.env.REDIS_URL } },
],
```

Both packages accept additional options. See the [Event Bus](/docs/architecture/event-bus#redis-configuration) docs for the full options reference.

### Set CORS origin

The API and dashboard run on different subdomains, so the browser will block requests unless you explicitly allow the dashboard origin:

```typescript
projectConfig: {
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  httpPort: Number(process.env.PORT) || 9000,
  cors: {
    origin: "https://app.yourdomain.com",
    credentials: true,
  },
},
```

Replace `app.yourdomain.com` with your actual dashboard domain. Without this, all API calls from the dashboard will fail with a CORS error.

### Disable schema auto-sync

In development the schema is synced on startup. In production, use explicit migrations instead:

```typescript
projectConfig: {
  autoSyncSchema: false,
},
```

---

## 4. Run Database Migrations

```bash
npm run db:migrate
```

---

## 5. Start the Server

`meridian start` (or `npm run start`) handles everything in a single command — it starts the API server with `NODE_ENV=production`, compiles any admin widget extensions, and serves the admin dashboard:

```bash
npm run start
```

Use a process manager like [PM2](https://pm2.keymetrics.io/) to keep it running:

```bash
npm install -g pm2

pm2 start "npm run start" --name meridian
pm2 save
pm2 startup   # auto-start on server reboot
```

---

## 6. nginx Configuration

The recommended setup uses two subdomains:
- `api.yourdomain.com` → API server on port `9000`
- `app.yourdomain.com` → Admin dashboard on port `5174`

Create `/etc/nginx/sites-available/meridian`:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Increase if you use file attachments
    client_max_body_size 50M;

    location / {
        proxy_pass         http://127.0.0.1:9000;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Required for SSE (GET /admin/events) — disables buffering
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 3600s;
    }
}

server {
    listen 80;
    server_name app.yourdomain.com;

    location / {
        proxy_pass         http://127.0.0.1:5174;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable it and reload nginx:

```bash
sudo ln -s /etc/nginx/sites-available/meridian /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Adding SSL

Once the site is running on HTTP, add SSL with Certbot:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.yourdomain.com -d app.yourdomain.com
```

Certbot will automatically update your nginx config to redirect HTTP to HTTPS and add the certificate blocks. After adding SSL, update your `cors.origin` in `meridian.config.ts` to use `https://`:

```typescript
cors: {
  origin: "https://app.yourdomain.com",
  credentials: true,
},
```

---

## 7. Health Check

Verify the API is running:

```bash
curl http://api.yourdomain.com/health
# {"ok":true}
```

---

## 8. Security Headers

Helmet is applied automatically by `@meridianjs/framework` when `NODE_ENV=production`. No configuration needed. Headers applied:

- `Content-Security-Policy`
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS)
- `Referrer-Policy`

---

## 9. Google OAuth (if used)

Update your `.env` with the production URLs and register the callback URL in the Google Cloud Console:

```bash
GOOGLE_REDIRECT_URI=https://api.yourdomain.com/auth/google/callback
APP_URL=https://app.yourdomain.com
```

Your `meridian.config.ts` should already reference these via env vars (set during scaffolding):

```typescript
{
  resolve: "@meridianjs/google-oauth",
  options: {
    clientId: process.env.GOOGLE_CLIENT_ID ?? "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    callbackUrl: process.env.GOOGLE_REDIRECT_URI ?? "",
    frontendUrl: process.env.APP_URL,
  },
}
```
