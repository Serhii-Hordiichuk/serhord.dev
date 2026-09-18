# SerHord.dev Landing — Design Spec

**Date:** 2026-09-18
**Market:** Norway, private + small business 1–20
**Languages:** NO (default) + EN, UK later via one i18n file
**Goal:** form submit + Cal.com booking

## Architecture

Astro 7 static, Tailwind v4 (@theme tokens), no JS framework. Copy in `src/i18n/no.ts|en.ts` typed via `Dict`.
Routes: `/no/`, `/en/`, `/` → `/no/`. Layout + Header/Hero/Sections/Contact/Footer.

## Design

Light Clean Business + engineer twist. Paper #FAF9F5, ink #101D2E, accent #0E7C4B, lime #D9F99D.
Fonts: Fraunces display, DM Sans body, IBM Plex Mono labels. Swiss grid, numbered sections 01–08,
terminal card in hero, status-dot, hard-shadow cards (8px). No purple gradients, no Inter/Roboto.

## Sections

1 Header sticky + NO/EN switch + CTA. 2 Hero H1 + dual CTA + terminal proof. 3 Trust chips.
4 Services 4 cards (web/ops/AI/OSINT) with `~/id`. 5 Process dark 3 steps. 6 Pricing 3 plans,
Business OS highlighted. 7 Ethics do/never + About. 8 FAQ details. 9 Contact form + Cal.
10 Footer + stack line.

## Constraints

- Transparent: you own code/domain/data, fixed price, no lock-in, OSINT legal-only disclaimer.
- Privacy: Turnstile, minimal collection, EU hosting note.
- Perf: 0 JS by default except form handler + Turnstile + Cal link; target 95+ Lighthouse.
- Infra: Vercel host, Cloudflare DNS-only (no proxy), R2 optional, sitemap + JSON-LD included.

## Verification

`npm run build` must exit 0 and produce `dist/no/index.html`, `dist/en/index.html`.
