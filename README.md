# WhisperPost

WhisperPost is a small anonymous-message relay built with Next.js, TypeScript, SQLite, and SMTP. The interface is split into React components rather than kept in a monolithic HTML file. The web app accepts and encrypts messages; a separate worker sends due email and retries transient failures.

## Project structure

```text
app/                         Next.js App Router pages and API endpoints
  api/messages/route.ts      Validate and queue a message
  api/messages/[id]/route.ts Read status only; never returns message content
  api/unsubscribe/route.ts    Confirm recipient opt-out
  privacy/page.tsx           Privacy and retention details
  unsubscribe/page.tsx       Recipient opt-out confirmation UI
components/                  Composer, schedule, theme, preview, and dialogs
lib/
  validation/                Request rules and shared types
  db/                        SQLite store
  mail/                      SMTP configuration and escaped email template
  queue/                     Enqueue and delivery operations
  security/                  Encryption, rate limiting, and opt-out tokens
worker/                      Separate scheduled delivery process
db/migrations/               SQLite schema
tests/unit/                  Validation, mail template, encryption, and queue tests
styles/                      Tailwind input and generated CSS
Dockerfile                   Multi-stage production image
compose.yaml                 Web app and delivery worker sharing a data volume
```

## Requirements

- Node.js 22.13 or later
- Docker Engine with the Compose plugin for container deployment
- An SMTP account and verified sender address for actual email delivery
- OpenSSL or an equivalent secure key generator

## Run locally

1. Install dependencies and create a local environment file:

   ```sh
   npm ci
   cp .env.example .env
   ```

2. Generate an encryption key:

   ```sh
   openssl rand -base64 32
   ```

   Add it to `APP_ENCRYPTION_KEY` in `.env`. Keep the value secret and stable; pending messages cannot be decrypted if it is lost.

3. Fill in `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `PUBLIC_BASE_URL` in `.env`. Use a verified sender address and `https://` for the public URL once deployed.
4. Start the Next.js development server:

   ```sh
   npm run dev
   ```

5. In a second terminal, start the delivery worker:

   ```sh
   npm run build:css
   npx tsc -p tsconfig.worker.json
   npm run start:worker
   ```

6. Open [http://localhost:3000](http://localhost:3000). The health endpoint is `/api/health`.

The UI and health endpoint run without SMTP, but the submission API returns an explicit `503` until delivery is configured. The worker requires a valid encryption key and SMTP configuration at startup.

## Test and production build

```sh
npm test
npm run build
```

`npm run build` builds local Tailwind CSS, the standalone Next.js app, and the compiled delivery worker.

## Deploy with Docker Compose

1. Copy `.env.example` to `.env`, generate a fresh `APP_ENCRYPTION_KEY`, and fill in the SMTP credentials and public HTTPS URL as above.
2. Build and start the web and worker services:

   ```sh
   docker compose up --build -d
   ```

3. Check the web service at `https://your-domain.example` through a TLS-terminating reverse proxy and check health at `/api/health`:

   ```sh
   docker compose ps
   docker compose logs -f web worker
   ```

4. Upgrade by rebuilding and replacing the services:

   ```sh
   docker compose up --build -d
   ```

The named `whisperpost-data` volume holds SQLite data and must persist across deployments. The compose setup is intentionally a **single-host, single-web-instance** deployment. The delivery worker shares the same SQLite volume and uses atomic claims to avoid two workers sending the same row. Do not horizontally scale these services or put the SQLite file on an arbitrary network filesystem; move to a managed database and shared queue before scaling.

For deployments outside Compose, run the Next standalone server (`npm start`) and the worker (`npm run start:worker`) as separate long-running processes with the same environment variables and persistent `DATA_DIR`. Put HTTPS in front of the web server. Configure the proxy to replace incoming `X-Forwarded-For` values rather than trusting client-supplied forwarding headers.

## Delivery, data, and limitations

- The server validates email, subject, message length, category, theme, consent, and schedule. Message bodies are limited to 2,000 characters; request bodies are limited to 12 KB; subjects are limited to 120 characters with line breaks rejected.
- Recipient, subject, body, category, and theme are encrypted in SQLite with AES-256-GCM while queued. The delivery worker decrypts them to send email through SMTP. Scheduled time and delivery state remain available to the queue and status API.
- `/api/messages/[id]` returns only the opaque message ID, delivery state, and scheduled time—not the recipient or message content. Treat the random ID as a private status token.
- SMTP delivery is best-effort. Transient failures are retried up to five times with backoff; provider acceptance does not guarantee inbox delivery. An SMTP timeout after provider acceptance can still result in a duplicate retry.
- `Delete our copy after delivery` deletes the app's encrypted copy when the SMTP server accepts the message. It cannot delete or recall email already delivered or retained by providers.
- Successfully delivered records and old queued/failed records are pruned after 30 days. Opt-outs are retained as one-way SHA-256 hashes so future messages to an opted-out address can be rejected.
- The app does not request sender identity or sender email and does not store sender IP addresses in the message database. The host, reverse proxy, and mail provider can still process or retain network and delivery metadata. **The app cannot guarantee sender anonymity.**
- In-memory IP rate limiting allows five submissions per 15 minutes per observed address and resets on restart. It is a basic abuse measure, not a bot challenge or moderation system. Before public launch, add an abuse contact, configure provider bounce/complaint handling, and review applicable email and privacy rules.
- No user accounts, sender inbox, AI moderation, view-once behavior, or guarantee of abuse prevention is included.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `APP_ENCRYPTION_KEY` | Yes | Canonical base64 encoding of exactly 32 random bytes |
| `SMTP_HOST` | For sending | SMTP hostname |
| `SMTP_PORT` | For sending | SMTP port (usually `587` or `465`) |
| `SMTP_SECURE` | For sending | Set `true` for implicit TLS, `false` for STARTTLS |
| `SMTP_USER` / `SMTP_PASS` | Provider-dependent | Set both or neither |
| `SMTP_FROM` | For sending | Verified sender address and optional display name |
| `PUBLIC_BASE_URL` | Yes for opt-out links | Public origin, e.g. `https://whisperpost.example.com` |
| `DATA_DIR` | No | SQLite directory; defaults to `./data` |
| `PORT` | No | Web port; defaults to `3000` |
