import React from 'react'
import Link from '@docusaurus/Link'
import useDocusaurusContext from '@docusaurus/useDocusaurusContext'
import Layout from '@theme/Layout'
import styles from './index.module.css'

/* ─── Hero ──────────────────────────────────────────────────── */
function Hero() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroInner}>

        {/* Left column */}
        <div className={styles.heroLeft}>
          <span className={styles.badge}>
            <span className={styles.badgeDot} />
            v1.18.1 · open source
          </span>

          <h1 className={styles.heroTitle}>
            Project management<br />
            infra for{' '}
            <span className={styles.heroAccent}>Node.js.</span>
          </h1>

          <p className={styles.heroSubtitle}>
            A Medusa.js-inspired modular framework for building custom project
            management tools — with a workflow engine, event bus, admin dashboard,
            and NPX scaffolding out of the box.
          </p>

          <div className={styles.heroButtons}>
            <Link className={styles.btnPrimary} to="/docs/getting-started">
              Get started →
            </Link>
            <Link
              className={styles.btnGhost}
              href="https://github.com/themeridianjs/meridianjs">
              GitHub ↗
            </Link>
          </div>
        </div>

        {/* Right column — terminal */}
        <div className={styles.heroTerminal}>
          <div className={styles.terminalBar}>
            <span className={`${styles.terminalDot} ${styles.terminalDotR}`} />
            <span className={`${styles.terminalDot} ${styles.terminalDotY}`} />
            <span className={`${styles.terminalDot} ${styles.terminalDotG}`} />
            <span className={styles.terminalLabel}>bash</span>
          </div>
          <div className={styles.terminalBody}>
            <p className={styles.tLine}>
              <span className={styles.tPrompt}>$</span>
              <span className={styles.tCmd}>npx create-meridian-app my-app</span>
            </p>
            <p className={styles.tSuccess}>✔ Scaffolded project in 1.8s</p>
            <p className={styles.tBlank} />
            <p className={styles.tLine}>
              <span className={styles.tPrompt}>$</span>
              <span className={styles.tCmd}>cd my-app && cp .env.example .env</span>
            </p>
            <p className={styles.tLine}>
              <span className={styles.tPrompt}>$</span>
              <span className={styles.tCmd}>npm run dev</span>
            </p>
            <p className={styles.tBlank} />
            <p className={styles.tInfo}>
              ▸ API server →{' '}
              <span className={styles.tUrl}>localhost:9000</span>
            </p>
            <p className={styles.tInfo}>
              ▸ Admin UI →{' '}
              <span className={styles.tUrl}>localhost:9001</span>
            </p>
            <p className={styles.tCursor}>▌</p>
          </div>
        </div>

      </div>
    </header>
  )
}

/* ─── Stats Strip ───────────────────────────────────────────── */
const stats = [
  'TypeScript-first',
  '12 core modules',
  'MIT license',
  'MikroORM + PostgreSQL',
  'Awilix DI',
  'BullMQ ready',
]

function StatsStrip() {
  return (
    <div className={styles.statsStrip}>
      <div className={styles.statsInner}>
        {stats.map((s) => (
          <span key={s} className={styles.statItem}>
            <span className={styles.statDot} />
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

/* ─── Features ──────────────────────────────────────────────── */
const features = [
  {
    num: '01',
    title: 'Modular by design',
    desc: 'Each domain is an isolated module with its own ORM instance, service, and Awilix DI container. Swap or extend any piece.',
  },
  {
    num: '02',
    title: 'File-based routes',
    desc: 'Drop a route.ts under src/api/ and it auto-registers. Export named GET, POST, PUT, DELETE handlers — zero Express wiring.',
  },
  {
    num: '03',
    title: 'Workflow engine',
    desc: 'DAG-based saga runner with LIFO compensation. Every mutation goes through a typed workflow with automatic rollback.',
  },
  {
    num: '04',
    title: 'Pluggable event bus',
    desc: 'Local EventEmitter in dev, Redis/BullMQ in prod. One line in meridian.config.ts. Subscribers auto-load from src/subscribers/.',
  },
  {
    num: '05',
    title: 'Admin dashboard',
    desc: 'React 18 + Vite + Tailwind SPA. Kanban board with custom statuses, sprint management, RBAC, workspace settings.',
  },
  {
    num: '06',
    title: 'NPX scaffolding',
    desc: 'npx create-meridian-app spins up a full project in seconds. meridian dev, build, and db:migrate handle the rest.',
  },
]

function Features() {
  return (
    <section className={styles.features}>
      <div className={styles.sectionHeader}>
        <p className={styles.sectionLabel}>What's included</p>
        <h2 className={styles.sectionTitle}>Everything a production app needs</h2>
      </div>
      <div className={styles.featureGrid}>
        {features.map((f) => (
          <div key={f.num} className={styles.featureCard}>
            <p className={styles.featureNum}>{f.num}</p>
            <h3 className={styles.featureName}>{f.title}</h3>
            <p className={styles.featureDesc}>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ─── Quick Start ───────────────────────────────────────────── */
function QuickStart() {
  return (
    <section className={styles.quickStart}>
      <div className={styles.quickStartInner}>

        <div className={styles.quickStartLeft}>
          <p className={styles.sectionLabel}>Quick start</p>
          <h2 className={styles.quickStartTitle}>
            One config.<br />Everything wired.
          </h2>
          <p className={styles.quickStartSubtitle}>
            All 12 core modules — auth, projects, issues, sprints, notifications —
            are loaded automatically by the default plugin. You only declare infrastructure.
          </p>
          <div className={styles.quickStartActions}>
            <Link className={styles.btnPrimary} to="/docs/getting-started">
              Read the guide →
            </Link>
            <Link className={styles.btnGhost} to="/docs/architecture/overview">
              Architecture ↗
            </Link>
          </div>
        </div>

        {/* Config preview */}
        <div className={styles.configBlock}>
          <div className={styles.configHeader}>
            <span className={styles.configFilename}>meridian.config.ts</span>
            <span className={styles.configLang}>TypeScript</span>
          </div>
          <div className={styles.configBody}>
            <p className={styles.configLine}>
              <span className={styles.tokKw}>import</span>
              <span className={styles.tokOp}> {'{'} </span>
              <span className={styles.tokFn}>defineConfig</span>
              <span className={styles.tokOp}>{' }'} </span>
              <span className={styles.tokKw}>from</span>
              <span className={styles.tokStr}> '@meridianjs/framework'</span>
              <span className={styles.tokOp}>;</span>
            </p>
            <p className={styles.configLine}>&nbsp;</p>
            <p className={styles.configLine}>
              <span className={styles.tokKw}>export default</span>
              <span className={styles.tokFn}> defineConfig</span>
              <span className={styles.tokOp}>({'{'}</span>
            </p>
            <p className={styles.configLine}>
              {'  '}<span className={styles.tokNm}>projectConfig</span>
              <span className={styles.tokOp}>: {'{'}</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokNm}>databaseUrl</span>
              <span className={styles.tokOp}>: </span>
              <span className={styles.tokFn}>process</span>
              <span className={styles.tokOp}>.</span>
              <span className={styles.tokFn}>env</span>
              <span className={styles.tokOp}>.</span>
              <span className={styles.tokAcc}>DATABASE_URL</span>
              <span className={styles.tokOp}>,</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokNm}>jwtSecret</span>
              <span className={styles.tokOp}>: </span>
              <span className={styles.tokFn}>process</span>
              <span className={styles.tokOp}>.</span>
              <span className={styles.tokFn}>env</span>
              <span className={styles.tokOp}>.</span>
              <span className={styles.tokAcc}>JWT_SECRET</span>
              <span className={styles.tokOp}>,</span>
            </p>
            <p className={styles.configLine}>
              {'  '}<span className={styles.tokOp}>{'}'},</span>
            </p>
            <p className={styles.configLine}>
              {'  '}<span className={styles.tokNm}>modules</span>
              <span className={styles.tokOp}>: [</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokCmt}>{'// swap for event-bus-redis in prod'}</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokOp}>{'{'} </span>
              <span className={styles.tokNm}>resolve</span>
              <span className={styles.tokOp}>: </span>
              <span className={styles.tokStr}>'@meridianjs/event-bus-local'</span>
              <span className={styles.tokOp}>{' }'}</span>
              <span className={styles.tokOp}>,</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokOp}>{'{'} </span>
              <span className={styles.tokNm}>resolve</span>
              <span className={styles.tokOp}>: </span>
              <span className={styles.tokStr}>'@meridianjs/job-queue-local'</span>
              <span className={styles.tokOp}>{' }'}</span>
              <span className={styles.tokOp}>,</span>
            </p>
            <p className={styles.configLine}>
              {'  '}<span className={styles.tokOp}>],</span>
            </p>
            <p className={styles.configLine}>
              {'  '}<span className={styles.tokNm}>plugins</span>
              <span className={styles.tokOp}>: [</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokCmt}>{'// loads all 12 core modules automatically'}</span>
            </p>
            <p className={styles.configLine}>
              {'    '}<span className={styles.tokOp}>{'{'} </span>
              <span className={styles.tokNm}>resolve</span>
              <span className={styles.tokOp}>: </span>
              <span className={styles.tokStr}>'@meridianjs/meridian'</span>
              <span className={styles.tokOp}>{' }'}</span>
              <span className={styles.tokOp}>,</span>
            </p>
            <p className={styles.configLine}>
              {'  '}<span className={styles.tokOp}>],</span>
            </p>
            <p className={styles.configLine}>
              <span className={styles.tokOp}>{'})'}</span>
              <span className={styles.tokOp}>;</span>
            </p>
          </div>
        </div>

      </div>
    </section>
  )
}

/* ─── CTA ───────────────────────────────────────────────────── */
function CTA() {
  return (
    <section className={styles.cta}>
      <div className={styles.ctaInner}>
        <p className={styles.ctaEyebrow}>Start building</p>
        <h2 className={styles.ctaTitle}>
          Your project management app starts here.
        </h2>
        <p className={styles.ctaSub}>
          Production-ready in minutes. Fully extensible with custom modules,
          plugins, and workflows.
        </p>
        <div className={styles.ctaButtons}>
          <Link className={styles.btnPrimary} to="/docs/getting-started">
            Get started →
          </Link>
          <Link
            className={styles.btnGhost}
            href="https://github.com/themeridianjs/meridianjs">
            View on GitHub ↗
          </Link>
        </div>
      </div>
    </section>
  )
}

/* ─── Page ──────────────────────────────────────────────────── */
export default function Home() {
  const { siteConfig } = useDocusaurusContext()
  return (
    <Layout title={siteConfig.title} description={siteConfig.tagline}>
      <Hero />
      <StatsStrip />
      <main>
        <Features />
        <QuickStart />
        <CTA />
      </main>
    </Layout>
  )
}
