# SerHord.dev — landing for the Norwegian market

Astro + Tailwind v4, i18n NO/EN, static export. Honest, calm, trustworthy.

## Stack

- **GitHub** — source of truth, PR previews
- **Vercel** — hosting, Edge, Analytics
- **Cloudflare** — DNS (DNS-only, no orange proxy to Vercel), Turnstile anti-spam, R2 for images
- **Cal.com** — booking, **Formspree/Resend** — form sending

## Run

```bash
npm install
cp .env.example .env
npm run dev      # http://localhost:4321/no/
npm run build    # → dist/
```

Routes: `/no/` (default), `/en/`, `/` redirects to `/no/`.

## Env

| Var | Where | Purpose |
|---|---|---|
| `PUBLIC_CAL_LINK` | Vercel env | Cal.com booking link |
| `PUBLIC_FORMSPOREE_ID` | Vercel env | `xxxxx` from formspree.io — without it form shows success-note (demo mode) |
| `PUBLIC_TURNSTILE_SITE_KEY` | Cloudflare → Vercel env | Turnstile widget |
| `OPENROUTER_API_KEY` | OpenRouter → Vercel env (**Sensitive, no `PUBLIC_` prefix!**) | AI-manager brain, server-side `/api/chat` only; without it the widget answers locally (fallback) |
| `OPENROUTER_MODEL` | Vercel env (server) | pinned `nvidia/nemotron-3-ultra-550b-a55b:free`, no fallbacks (owner has exclusive tester access) |
| `OPENROUTER_SITE_URL` | Vercel env (server) | `https://serhord.dev` for OpenRouter rankings |

## AI-manager widget

- Brain: Nemotron 3 Ultra (text) via `/api/chat`, **streamed** (SSE tokens proxied 1:1); key never reaches the browser.
- Persona: warm human-like sales manager — small talk (mood, weather), one short message + one question at a time, gradually collects name → business → need → timeline → contact. No quick-question chips; the AI leads the conversation.
- Voice input: Web Speech API (free, Chrome/Edge best), auto-hidden where unsupported.
- Attachments: text/code files (≤100 KB, ≤3) read locally and sent as context; pasted URLs fetched server-side (≤2, stripped, capped); images politely declined (model is text-only) with guidance.
- Lead handoff: after first AI reply a button prefills `#contact` with the dialogue summary.
- Abuse guards: per-IP rate limit (10 req/min), size caps, 12-message history.

## Deploy GitHub → Vercel → Cloudflare

1. GitHub: push repo `serhord.dev`, default branch `main`.
2. Vercel: New Project → Import GitHub repo → Framework `Astro` → add env vars → Deploy.
   Domain `serhord.dev` + `www` added in Vercel → copy DNS records.
3. Cloudflare: domain DNS:
   - `A @ 76.76.21.21` (Vercel) **DNS only (grey cloud!)** — orange proxy breaks Vercel SSL/CDN.
   - `CNAME www cname.vercel-dns.com` DNS only.
   - Turnstile: Security → Turnstile → create widget for `serhord.dev` → paste site key to env.
   - Optional: R2 bucket `serhord-media` for og-images, Cache Rule `Cache Everything` for `/assets/*`.
4. Cal.com: create 15-min event `intro` → paste link to `PUBLIC_CAL_LINK`.

## Content editing

All copy lives in `src/i18n/no.ts` + `en.ts`. Prices, FAQ, services — edit there, no code needed.

## What next

- [x] Org.nr placeholder in footer (`000 000 000`, 9 digits) + privacy page `/no/personvern`
- [ ] Real org.nr / account (`0000 00 00000`) / Vipps (`00000`) — replace zeros when received
- [ ] Connect Formspree/Resend + test Turnstile (needs keys in Vercel env)
- [x] OG image 1200×630 in `public/og.jpg`
- [x] Vercel Analytics + Speed Insights
- [x] Offer template stub `/no/tilbud` (PDF + Vipps-link later)
