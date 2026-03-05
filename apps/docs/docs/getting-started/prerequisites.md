---
id: prerequisites
title: Prerequisites
description: Required tools and services before running MeridianJS.
sidebar_position: 2
---

# Prerequisites

Before you start, make sure you have:

- **Node.js >= 20** — [nodejs.org](https://nodejs.org) or via [nvm](https://github.com/nvm-sh/nvm)
- **npm >= 10** — bundled with Node.js 20
- **PostgreSQL >= 14** — a running instance with a database created for your project
- **Git** (recommended)

Create a database before starting:

```bash
createdb meridian_dev
# or via psql:
psql -c "CREATE DATABASE meridian_dev;"
```

Your `DATABASE_URL` in `.env` must point to this database, e.g.:
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/meridian_dev
```

Optional (for production/distributed setups):

- **Redis >= 6** — required if you use `@meridianjs/event-bus-redis` or `@meridianjs/job-queue-redis`
