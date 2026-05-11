# Tracking Studio

TAO-branded tracking configuration UI (TanStack Start + React + Tailwind v4).

## Quick start

```bash
npm install
npm run dev
```

```bash
npm run build
npm run lint
```

## Configure wizard persistence

Draft and live setup are stored in the browser (`localStorage`). Keys are defined in [`src/components/tracking-studio/configure/tracking-setup-storage.ts`](src/components/tracking-studio/configure/tracking-setup-storage.ts) (`KEY_DRAFT`, `KEY_LIVE`, `KEY_MODE`).

## Publish to a new Git remote

See [`docs/PUBLISHING.md`](docs/PUBLISHING.md) and optionally run:

```bash
chmod +x scripts/push-new-origin.sh
./scripts/push-new-origin.sh https://github.com/YOU/YOUR-NEW-REPO.git
```

## Replicate this product elsewhere

Copy the prompt in [`REPLICATION_PROMPT.md`](REPLICATION_PROMPT.md) into another environment and paste your **published repo URL** where indicated.
