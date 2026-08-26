# Nux frontend

Next.js UI for **Nux** — landing page, live session (camera / mic / screen), Trust & How-to drawers.

## Dev

```bash
npm install
npm run dev
```

Requires the backend on port 8000 (see root `README.md`).

```bash
# frontend/.env.local
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Open http://localhost:3000 → **Talk with Nux**.

## Branding assets

| File | Role |
|------|------|
| `app/icon.svg` | Tab favicon |
| `app/favicon.ico` | Legacy favicon |
| `app/apple-icon.png` | iOS home screen |
| `public/nux-portrait.png` | Hero portrait |

Do not use the stock `public/vercel.svg` as a favicon — Nux uses the icons under `app/`.
