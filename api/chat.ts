// Vercel Serverless Function — OpenRouter proxy + AI sales manager brain.
// Секрети (БЕЗ префікса PUBLIC_) тільки тут:
//   OPENROUTER_API_KEY   — Sensitive, обов'язково
//   OPENROUTER_MODEL     — основна модель (default: nemotron free)
//   OPENROUTER_SITE_URL  — для OpenRouter rankings
// У браузер ключ ніколи не потрапляє: фронтенд викликає /api/chat.
//
// Роутінг за задачею (v1, без vision-моделі за рішенням власника):
//   текст / файли-текст / посилання → Nemotron 3 Ultra (:free, 1M ctx)
//   картинки → НЕ відправляємо моделі (Nemotron text-only); клієнт показує
//              пояснення і просить описати словами / надіслати через форму.

const PRIMARY_DEFAULT = 'nvidia/nemotron-3-ultra-550b-a55b:free';
// Фолбеків на інші моделі немає свідомо: власник має ексклюзивний
// тестовий доступ до Nemotron без лімітів — все тільки на ній.
// Якщо апстрім недоступний → 502 → фронтенд відповідає локально.

// ---- Sales persona: чесний менеджер + один CTA (NO/EN) ----
const SYSTEM_NO = `You are the SerHord.dev AI sales manager for individuals & small business in Norway. Reply in Norwegian Bokmål. Honest, calm, concrete — never pushy, never invent facts.

COMPANY: SerHord.dev — webutvikling (Astro/Next, fra 5900 kr), drift (VPS/backup/e-post), KI på egne data (EU-hosting, pilot fra ca. 8900 kr), OSINT+sikkerhet+personvern (OWASP-sjekk, lekkasje, fra 2900 kr), verksted: virus-rens fra 990 kr, OS-install (Win/Linux/ChromeOS) fra 790 kr, SSD/RAM/skjerm/batteri (reparasjon fra 1500 kr), lokal server/NAS (Nextcloud+VPN, fra 6900 kr), vedlikehold (fra 490 kr/mnd). Pakker: Start fra 5900 kr (7–10 dager), Business OS fra 17900 kr, Care 990 kr/mnd. Fastpris skriftlig, du eier alt, svar innen 24t, norsk faktura. Base Ørsta/Volda — besøk der, ring +47 96 68 92 37. Kontakt: skjema + Cal.com intro (15 min, gratis).

SALES PLAYBOOK:
1) Kvalifiser med max 2–3 korte spørsmål av gangen: hva plager dem, hva har de prøvd, ønsket tidspunkt. Ikke forhør — ett steg om gangen.
2) Når du forstår behovet: foreslå ÉN konkret pakke med fastpris + hva som skjer videre. Aldri vegg av tekst.
3) Innvendinger: pris → bryt ned verdi og tilby mindre startpakke; "tenke på det" → foreslå gratis 15-min intro med konkret agenda; tillit → vis til fastpris skriftlig, eierskap, ingen binding.
4) Vedlagte filer/lenker: LES dem faktisk — referer konkret til innholdet deres (krav, sider, tekniske detaljer), still oppfølgingsspørsmål som viser at du forstod. Kan du diskutere prosjektdetaljer på alvor.
5) Aldri si du kan se bilder/skjermbilder — modellen er text-only. Be om å beskrive med ord eller sende via kontaktskjemaet.
6) Hver melding: max 120 ord, kuler tillatt, alltid ETT konkret neste steg (f.eks. "Send meg X, så gir jeg fastpris i morgen" eller booking). Aldri nekt — utenfor scope? Tilby nærmeste alternativ + ærlig grense.
7) OSINT/sikkerhet kun lovlig: åpne kilder + samtykke, ingen hacking/stalking.
8) Når kunden er varm (sier ja / ber om tilbud / gir kontaktinfo): be om navn + telefon/e-post, oppsummer behov + foreslått pakke + pris, og si at du fyller kontaktskjemaet klart for dem.`;

const SYSTEM_EN = `You are the SerHord.dev AI sales manager for individuals & small business in Norway. Reply in English. Honest, calm, concrete — never pushy, never invent facts.

COMPANY: SerHord.dev — web dev (Astro/Next, from NOK 5900), ops (VPS/backup/email), AI on your data (EU hosting, pilot from ~NOK 8900), OSINT+security+privacy (OWASP check, leaks, from NOK 2900), workshop: malware cleanup from NOK 990, OS install (Win/Linux/ChromeOS) from NOK 790, SSD/RAM/screen/battery (repair from NOK 1500), local server/NAS (Nextcloud+VPN, from NOK 6900), maintenance (from NOK 490/mo). Packages: Start from NOK 5900 (7–10 days), Business OS from NOK 17900, Care NOK 990/mo. Fixed written quotes, you own everything, 24h reply. Based in Ørsta/Volda, Norway — call +47 96 68 92 37. Contact: form + Cal.com intro (15 min, free).

SALES PLAYBOOK:
1) Qualify with max 2–3 short questions at a time: what's bothering them, what they tried, desired timeline. One step at a time, no interrogation.
2) When you understand the need: propose ONE concrete package with fixed price + what happens next. No walls of text.
3) Objections: price → break down value, offer a smaller starter; "need to think" → propose a free 15-min intro with a concrete agenda; trust → point to written fixed quotes, ownership, no lock-in.
4) Attached files/links: actually READ them — reference their content concretely (requirements, pages, technical details), ask follow-ups proving understanding. Discuss project details seriously.
5) Never claim you can see images/screenshots — the model is text-only. Ask to describe in words or send via the contact form.
6) Every message: max 120 words, bullets ok, always ONE concrete next step. Never refuse — out of scope? Offer the closest alternative + honest boundary.
7) OSINT/security legal only: open sources + consent, no hacking/stalking.
8) When the customer is hot (says yes / asks for a quote / shares contact info): ask for name + phone/email, summarise need + proposed package + price, and say you'll get the contact form ready for them.`;

// ---- Limits (анти-аб'юз публічного віджета) ----
const MAX_HISTORY = 12;
const MAX_MSG = 2000;
const MAX_LAST_USER = 4000; // питання + вкладення-текст упакують окремо
const MAX_FILES = 3;
const MAX_FILE_CHARS = 30000;
const MAX_URLS = 2;
const MAX_URL_CHARS = 20000;
const FETCH_TIMEOUT_MS = 8000;
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rate = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const cur = rate.get(ip);
  if (!cur || now > cur.reset) {
    rate.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return false;
  }
  cur.count += 1;
  return cur.count > RATE_MAX;
}

type ChatMsg = { role: 'user' | 'assistant'; content: string };

function sanitizeMessages(input: unknown): ChatMsg[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: string; content: string } =>
        !!m && typeof m === 'object' && typeof (m as any).role === 'string' && typeof (m as any).content === 'string',
    )
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content.slice(0, MAX_MSG) }))
    .slice(-MAX_HISTORY);
}

type Attachment = { kind: string; name?: string; text?: string };

function sanitizeAttachments(input: unknown): { name: string; text: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter((a): a is Attachment => !!a && typeof a === 'object' && (a as any).kind === 'text')
    .map((a) => ({
      name: String(a.name || 'file').slice(0, 120),
      text: String(a.text || '').slice(0, MAX_FILE_CHARS),
    }))
    .filter((a) => a.text.trim().length > 0)
    .slice(0, MAX_FILES);
}

function extractUrls(text: string): string[] {
  const found = text.match(/https?:\/\/[^\s<>"')\]]+/gi) || [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of found) {
    const clean = u.replace(/[.,;:!?]+$/, '');
    if (!seen.has(clean) && /^https?:\/\//i.test(clean)) {
      seen.add(clean);
      out.push(clean);
      if (out.length >= MAX_URLS) break;
    }
  }
  return out;
}

function hostBlocked(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return (
      h === 'localhost' ||
      h.endsWith('.local') ||
      h.endsWith('.internal') ||
      /^127\./.test(h) ||
      /^10\./.test(h) ||
      /^192\.168\./.test(h) ||
      /^169\.254\./.test(h) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
      h === '[::1]' ||
      h === '::1' ||
      h === '0.0.0.0'
    );
  } catch {
    return true;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchUrlText(url: string): Promise<string> {
  if (hostBlocked(url)) return '';
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'SerHord.dev AI manager (link preview)', Accept: 'text/html,text/plain,*/*' },
      redirect: 'follow',
    });
    if (!res.ok) return '';
    const ctype = res.headers.get('content-type') || '';
    if (!/text|html|json|xml|markdown/i.test(ctype)) return '';
    const raw = await res.text();
    const text = ctype.includes('html') ? stripHtml(raw) : raw.replace(/\s+/g, ' ').trim();
    return text.slice(0, MAX_URL_CHARS);
  } catch {
    return '';
  } finally {
    clearTimeout(timer);
  }
}

async function callOpenRouter(apiKey: string, siteUrl: string, model: string, system: string, messages: ChatMsg[]) {
  return fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'HTTP-Referer': siteUrl,
      'X-Title': 'SerHord.dev AI manager',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: system }, ...messages],
      temperature: 0.6,
      max_tokens: 500,
    }),
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const ip =
    (req.headers?.['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket?.remoteAddress ||
    'unknown';
  if (rateLimited(ip)) {
    return res.status(429).json({ error: 'Too many requests, try again in a minute' });
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    // Немає ключа — фронтенд перейде на локальний fallback localBrain()
    return res.status(501).json({ error: 'AI not configured' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const lang = body.lang === 'en' ? 'en' : 'no';
    const messages = sanitizeMessages(body.messages);
    if (messages.length === 0) {
      return res.status(400).json({ error: 'Empty messages' });
    }
    const last = messages[messages.length - 1];
    if (last.role !== 'user' || last.content.trim().length === 0) {
      return res.status(400).json({ error: 'Last message must be a user question' });
    }

    // Вкладення-текст (файли, які клієнт прочитав локально) + авто-читання посилань
    const files = sanitizeAttachments(body.attachments);
    const urls = extractUrls(last.content);
    const fetched: { url: string; text: string }[] = [];
    for (const u of urls) {
      const text = await fetchUrlText(u);
      if (text) fetched.push({ url: u, text });
    }

    const contextParts: string[] = [];
    for (const f of files) {
      contextParts.push(`--- Attached file: ${f.name} ---\n${f.text}`);
    }
    for (const f of fetched) {
      contextParts.push(`--- Linked page: ${f.url} ---\n${f.text}`);
    }
    if (contextParts.length > 0) {
      last.content = `${last.content.slice(0, MAX_LAST_USER)}\n\n[PROJECT MATERIALS the user shared — read and reference concretely:]\n${contextParts.join('\n\n')}`.slice(
        0,
        MAX_LAST_USER + MAX_FILES * MAX_FILE_CHARS + MAX_URLS * MAX_URL_CHARS,
      );
    } else {
      last.content = last.content.slice(0, MAX_LAST_USER);
    }

    const primary = process.env.OPENROUTER_MODEL || PRIMARY_DEFAULT;
    const siteUrl =
      process.env.OPENROUTER_SITE_URL || process.env.PUBLIC_OPENROUTER_SITE_URL || 'https://serhord.dev';
    const system = lang === 'en' ? SYSTEM_EN : SYSTEM_NO;

    const upstream = await callOpenRouter(apiKey, siteUrl, primary, system, messages);
    const usedModel = primary;
    const viaFallback = false;
    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('OpenRouter error:', upstream.status, text.slice(0, 500));
      return res.status(502).json({ error: 'Upstream error' });
    }

    const data = await upstream.json();
    const text: string = data.choices?.[0]?.message?.content || '';
    if (!text) return res.status(502).json({ error: 'Empty upstream reply' });
    return res.status(200).json({ text, model: usedModel, viaFallback });
  } catch (e) {
    console.error('api/chat failed:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
