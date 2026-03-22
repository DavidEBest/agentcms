# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AgentCMS is a SvelteKit-based portfolio and content management system for artists. It provides an admin dashboard for managing artist profiles, image galleries, news posts, and social links, backed by SQLite and S3-compatible file storage with magic link email authentication.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run check        # TypeScript/Svelte type checking
npm run db:generate  # Generate Drizzle migrations from schema changes
npm run db:migrate   # Apply pending migrations
npm run db:studio    # Open Drizzle Studio GUI
```

There is no test suite yet.

## Architecture

### Tech Stack

- **SvelteKit 2** with **Svelte 5** (runes mode enabled globally)
- **Drizzle ORM** over **better-sqlite3** (WAL mode, foreign keys enabled)
- **S3-compatible storage** (AWS S3 or Cloudflare R2) via `@aws-sdk/client-s3`
- **Resend** for transactional email (magic links)
- **Tailwind CSS v4** with `@tailwindcss/typography`

### Route Structure

- `src/routes/auth/` — Public login flow (magic link request + token verification + logout)
- `src/routes/(admin)/` — All protected admin pages (route group, not a URL segment)
- Auth guard lives in `(admin)/+layout.server.ts`; session resolution in `hooks.server.ts`

### Data Layer

All mutations use **SvelteKit form actions** (no separate API routes). Data lives in:

- `src/lib/server/db/schema.ts` — Single source of truth for all tables (users, magicTokens, sessions, artistProfiles, socialLinks, galleryItems, newsItems)
- `src/lib/server/db/index.ts` — DB initialization
- `src/lib/server/auth.ts` — Magic link generation/verification, session management
- `src/lib/server/storage.ts` — Presigned S3 URL generation and object deletion

### Authentication Flow

1. User submits email → `sendMagicLink()` creates a one-time token (15-min TTL) and emails a `/auth/verify?token=` link
2. `verifyMagicLink()` validates the token, marks it used, creates a 30-day session cookie
3. `hooks.server.ts` resolves session → `event.locals.user` on every request

### File Uploads

Client-side uploads to S3 via presigned URLs. Server calls `getUploadUrl()` to return a short-lived PUT URL; the browser uploads directly. Keys are namespaced as `uploads/{userId}/{nanoid}.{ext}`.

## Environment Variables

See `.env.example` for required variables:

- `DATABASE_PATH` — SQLite file path
- `RESEND_API_KEY`, `EMAIL_FROM` — Email sending
- `S3_REGION`, `S3_ENDPOINT`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_BUCKET`, `S3_PUBLIC_URL` — Storage

## Schema Changes

After editing `src/lib/server/db/schema.ts`, run `npm run db:generate` then `npm run db:migrate`. Migration files live in `drizzle/`.
