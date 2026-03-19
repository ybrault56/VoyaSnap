# Screen Me

Screen Me is a Next.js application for selling moderated playback slots on a giant tourist street display.

The same codebase contains:
- the traveler QR flow
- the public order tracking pages
- the moderation/admin back-office
- the fullscreen player
- the API routes for quotes, orders, uploads, payments, scheduling and moderation

## Functional scope

Traveler flow:
- scan a QR code
- choose `image`, `video` or `message`
- choose playback duration, repeat interval and requested time window
- get an instant quote
- upload the media
- pay through Stripe Checkout
- receive order confirmation and a public tracking link
- wait for moderation and scheduling

Admin flow:
- sign in through the admin login
- review paid orders waiting for moderation
- approve or reject content
- issue automatic vouchers on rejection
- update pricing rules
- recompute the schedule
- inspect orders, vouchers, slots and audit entries

Player flow:
- fetch signed playback feed entries for the screen
- ping heartbeat regularly
- preload upcoming media
- render image, muted video or postcard-style text
- fall back to a branded idle screen when no slot is active

## Technical stack

Application:
- `Next.js 16`
- `React 19`
- `TypeScript`
- `Tailwind CSS 4`

Business logic:
- pure application services in `src/lib/pricing.ts`, `src/lib/scheduler.ts`, `src/lib/workflow.ts`
- validation with `zod`

Persistence:
- `PostgreSQL`
- `Prisma 6` client and schema in [`prisma/schema.prisma`](./prisma/schema.prisma)
- transactionally serialized state mutations through a Prisma adapter in [`src/lib/store-db.ts`](./src/lib/store-db.ts)
- file-backed fallback store for local/demo mode in [`src/lib/store-file.ts`](./src/lib/store-file.ts)

Media storage:
- S3-compatible object storage through `@aws-sdk/client-s3`
- presigned `PUT` URLs for traveler uploads
- signed app URLs for media playback
- local filesystem fallback when S3 variables are not configured

Payments:
- `Stripe Checkout`
- webhook handling for `checkout.session.completed`

Email:
- SMTP delivery through `nodemailer`
- transactional emails emitted from queued `NotificationEvent` records

Admin security:
- signed httpOnly session cookie
- environment-backed admin credentials
- role support: `moderator` and `ops_admin`

Testing and quality:
- `ESLint`
- `Vitest`
- `next build`

## Project structure

Main folders:
- `src/app`: pages and API routes
- `src/components`: traveler, admin and player UI
- `src/lib`: business logic, persistence adapters, auth, email, media and utilities
- `prisma`: schema and migrations

Important files:
- [`src/lib/store.ts`](./src/lib/store.ts): chooses SQL store or file store
- [`src/lib/store-db.ts`](./src/lib/store-db.ts): PostgreSQL/Prisma runtime adapter
- [`src/lib/media.ts`](./src/lib/media.ts): signed uploads and playback access
- [`src/lib/auth.ts`](./src/lib/auth.ts): admin session signing and verification
- [`src/lib/mail.ts`](./src/lib/mail.ts): SMTP delivery
- [`src/app/admin/page.tsx`](./src/app/admin/page.tsx): protected admin UI
- [`src/app/admin/login/page.tsx`](./src/app/admin/login/page.tsx): admin login page

## Environment variables

Copy `.env.example` to `.env` and fill the production values.

Required for core production runtime:
- `NEXT_PUBLIC_APP_URL`: public application URL
- `DATABASE_URL`: PostgreSQL connection string
- `MEDIA_URL_SECRET`: secret used to sign media URLs
- `STRIPE_SECRET_KEY`: Stripe server key
- `STRIPE_WEBHOOK_SECRET`: Stripe webhook signing secret
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `PLAYER_DEVICE_TOKEN`

Required for object storage:
- `S3_BUCKET`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `S3_ENDPOINT` when using a non-AWS S3-compatible provider
- `S3_FORCE_PATH_STYLE=true` when your provider requires path-style URLs

Required for real email delivery:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO` optional

## Installation

1. Install dependencies.

```powershell
npm install
```

2. Create the environment file.

```powershell
Copy-Item .env.example .env
```

3. Fill `.env` with your production or staging values.

4. Generate Prisma client.

```powershell
npx prisma generate
```

5. Review the SQL migration and apply it to the database you want to use.

Development migration creation already exists in [`prisma/migrations/202603181500_production_runtime/migration.sql`](./prisma/migrations/202603181500_production_runtime/migration.sql).

To apply migrations on a target environment:

```powershell
npx prisma migrate deploy
```

6. Start the app locally.

```powershell
npm run dev
```

## Local development modes

Full production-like mode:
- configure PostgreSQL, S3-compatible storage, SMTP and admin secrets
- the runtime uses Prisma, object storage, real emails and signed admin sessions

Fallback mode:
- if `DATABASE_URL` is absent, the app uses the local JSON store in `.data/screen-me-store.json`
- if S3 is absent, uploads fall back to the local filesystem under `.data/uploads`
- if SMTP is absent, notifications are still recorded but delivery is marked as not configured

## Usage

### Client usage

1. Open `/{locale}/submit` from a QR code or directly.
2. Choose the media type.
3. Upload a file or enter a message.
4. Choose playback duration, repeat interval and requested time window.
5. Enter traveler contact details and accept the rights/moderation checkboxes.
6. Review the instant quote.
7. Submit the order.
8. If Stripe is configured, the traveler is redirected to Checkout.
9. After payment, the traveler lands on a public tracking page at `/{locale}/orders/{publicToken}`.

### Admin usage

1. Open `/admin/login`.
2. Sign in with the credentials from `.env`.
3. Open `/admin`.
4. Review items in the moderation queue.
5. Approve content to schedule it.
6. Reject content with a reason to automatically issue a voucher.
7. If the session role is `ops_admin`, update pricing rules and recompute the schedule.
8. Review upcoming slots, issued vouchers, recent orders and the audit log.

### Player usage

1. Open `/player` on the screen device.
2. The page uses `PLAYER_DEVICE_TOKEN` to authenticate against the player feed API.
3. The device polls `/api/player/feed` and `/api/player/heartbeat` automatically.
4. Scheduled content is rendered fullscreen when the current time falls inside a slot.

## Deployment notes

Vercel:
- set all variables from `.env.example` in the Vercel project settings
- make sure the Stripe webhook points to `/api/stripe/webhook` on the production URL
- run `npx prisma migrate deploy` during deployment or before first production start

Database:
- the SQL adapter serializes mutations with a PostgreSQL advisory lock
- this keeps the existing in-memory business workflow deterministic even with concurrent admin or payment events

Object storage:
- configure bucket CORS to allow browser `PUT` uploads from your application domain
- keep the bucket private; media playback is served through signed app URLs

Email:
- use a production SMTP provider
- verify `EMAIL_FROM` on the provider before going live

## Quality commands

```powershell
npm run lint
npm run test
npm run build
```

## Current production assumptions

- one physical site and one logical screen
- Europe/Paris scheduling timezone
- EUR pricing
- muted video playback on the public display
- one environment-defined admin account in v1

## Remaining operational inputs

Code integration is done, but these values still need to exist in the real environment for a fully live setup:
- object storage credentials and endpoint
- SMTP credentials
- admin credentials and session secret
- a strong `PLAYER_DEVICE_TOKEN`
- Stripe webhook configured against the production deployment URL