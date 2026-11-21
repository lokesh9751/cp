# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (App Router), React, JavaScript, Tailwind CSS, CodeMirror 6, TanStack Query, Zod, Express.js, Prisma, PostgreSQL, Redis, Judge0 CE, Docker

## Users

Primary: Developers and students who want to practice DSA (Data Structures & Algorithms) and competitive programming problems, and participate in coding contests.
Secondary: Contest organizers, educators using the platform for assignments.

Situation: Users visit to solve problems, join timed contests, track progress, and compare on leaderboards. They need a fast, distraction-free environment that works on low-end devices.

Job: Practice problems efficiently, join contests reliably, see clear progress, and improve skills without UI friction.

## Product Purpose

A competitive programming practice platform where users solve DSA and CP problems, submit code against hidden test cases, join timed contests, and track progress through submissions, leaderboards, and profiles. Success means users return regularly to practice, contests run smoothly, and the platform performs well on old hardware.

## Positioning

A clean, calm, professional developer platform—not a gamified "pirate game." The pirate theme is subtle (logo, small accents, empty-state copy only). Performance and clarity for problem-solving come first.

## Operating Context

- Desktop-first responsive web app (mobile supported)
- Code execution via Judge0 CE in isolated Docker containers
- Submissions processed asynchronously via BullMQ/Redis worker
- PostgreSQL for relational data (users, problems, submissions, contests)
- S3-compatible storage for large test case files
- Deployed on VPS with Docker Compose (web, API, worker, DB, Redis, Judge0)
- CI/CD via GitHub Actions
- Observability: Sentry, Prometheus, Grafana

## Capabilities and Constraints

- Practice problems with filters (difficulty, topic, status, search)
- Sample and hidden test cases
- Multi-language code editor (CodeMirror 6, lazy-loaded)
- Timed contests (DSA and CP types) with registration and leaderboards
- User profiles, submission history, bookmarks, notes
- JWT auth (access + refresh tokens), bcrypt/argon2 password hashing
- Rate limiting, caching via Redis
- No dark mode in v1 (light theme only)
- System font stack for performance
- No heavy animations, parallax, videos, 3D, large images
- Pagination/Load more (no infinite scroll)
- Accessible: 4.5:1 contrast minimum, color + icon/label for status

## Brand Commitments

Name: Competitive Pirates
Tagline: Practice DSA. Compete. Level up.
Logo: Small compass or ship-wheel icon + wordmark
Colors: Navy #123B63 (primary), Sand/off-white #FAF8F4 (background), Gold/amber #B7791F (primary actions sparingly), Green #15803D (success only), Red #B91C1C (errors only)
Voice: Professional, calm, beginner-friendly, no marketing fluff

## Evidence on Hand

Detailed product specification (pasted in conversation) covering frontend, backend, database, judging, deployment, performance constraints, and full UI design requirements for the questions page.

## Product Principles

1. Performance on low-end devices is a feature, not an afterthought
2. Clarity and scanability beat visual flourish
3. Subtle brand identity never interferes with problem-solving
4. Server-rendered content for fast first paint; client JS only where interactive
5. Accessible by default: color never the sole signal, visible focus states

## Accessibility & Inclusion

WCAG 2.1 AA minimum. All text 4.5:1 contrast. Status conveyed by color + icon/label. Keyboard-navigable with visible focus outlines. No auto-playing motion. System fonts respect user preferences.