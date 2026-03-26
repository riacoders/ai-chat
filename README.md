# SecGPT Chat (Next.js)

`chats-ai` now runs fully on Next.js App Router.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run lint
npm run typecheck
npm run build
npm run start
```

## Environment

Use `.env` (or `.env.local`) with:

```env
API_BASE_URL=http://localhost:8000
```

Frontend requests are sent to `/api/*` and proxied by Next.js server route to `API_BASE_URL`.

## Pages

- `/login`
- `/register`
- `/chat`

## Chat Modes

- `Ask`: fixed chat + `Resources` panel
- `Agent`: resizable split with terminal on the right
