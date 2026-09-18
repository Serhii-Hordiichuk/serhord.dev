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
| `PUBLIC_OPENROUTER_MODEL` | Vercel env | e.g. `openai/gpt-4o-mini`, `anthropic/claude-3.5-haiku` (public default, safe) |
| `OPENROUTER_API_KEY` | OpenRouter → Vercel env (**Sensitive, без `PUBLIC_`!**) | AI-manager brain, тільки сервер `/api/chat`; без нього віджет відповідає локально (fallback) |
| `OPENROUTER_MODEL` | Vercel env (server) | e.g. `openai/gpt-4o-mini` — дефолт для `/api/chat` |
| `OPENROUTER_SITE_URL` | Vercel env (server) | `https://serhord.dev` for OpenRouter rankings |

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

- [ ] Real org.nr in footer + privacy page `/no/personvern`
- [ ] Connect Formspree/Resend + test Turnstile
- [ ] OG image 1200×630 in `public/og.jpg`
- [ ] Vercel Analytics + Speed Insights
- [ ] Norwegian invoice (Vipps/Bank) details on offer PDF
