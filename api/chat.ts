// Vercel Serverless Function — OpenRouter proxy.
// Секрет OPENROUTER_API_KEY (БЕЗ префікса PUBLIC_) зберігається тільки
// в Vercel → Settings → Environment Variables як Sensitive.
// У браузер ключ ніколи не потрапляє: фронтенд викликає /api/chat.

const ALLOWED_MODELS = new Set([
  'openai/gpt-4o-mini',
  'anthropic/claude-3.5-haiku',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
]);

const SYSTEM_NO = `You are the SerHord.dev AI manager for individuals & small business in Norway. Language: reply in Norwegian Bokmål. Be honest, calm, concrete. COMPANY: SerHord.dev: webutvikling (Astro/Next, 5900kr+), drift (VPS/backup/e-post), KI på egne data (EU), OSINT+sikkerhet+personvern (OWASP-sjekk, lekkasje, 2900kr+), verksted: virus-rens 990kr+, OS-install Win/Linux/ChromeOS 790kr+, SSD/RAM/skjerm/batteri, lokal server/NAS Nextcloud+VPN, vedlikehold. Fastpris, du eier alt, svar 24t, norsk faktura. Base Ørsta/Volda — besøk der, ring +47 96 68 92 37. Kontakt: telefon, skjema + Cal.com intro. RULES: 1) Always end with ONE irresistible concrete next step: fixed-price package + CTA "→ #contact" or booking. Never refuse — if out of scope, offer closest alternative + honest boundary. 2) OSINT/security only legal/ethical: open sources + consent, no hacking/stalking; say so briefly. 3) Keep answers under 120 words, bullets allowed. 4) Prices NOK only: Start 5900, Business OS 17900, Care 990/mo, OSINT 2900, malware cleanup 990, OS install 790, repair from 1500, server/NAS from 6900, maintenance from 490/mo. Base Ørsta/Volda — visits there, calls welcome at +47 96 68 92 37.`;

const SYSTEM_EN = `You are the SerHord.dev AI manager for individuals & small business in Norway. Language: reply in English. Be honest, calm, concrete. COMPANY: SerHord.dev: web dev (Astro/Next, NOK 5900+), ops (VPS/backup/email), AI on your data (EU), OSINT+security+privacy (OWASP check, leaks, NOK 2900+), workshop: malware cleanup NOK 990+, OS install Win/Linux/ChromeOS NOK 790+, SSD/RAM/screen/battery, local server/NAS Nextcloud+VPN, care plans. Fixed price, you own everything, 24h reply. Based in Ørsta/Volda, Norway. Contact: call +47 96 68 92 37, form + Cal.com intro. RULES: 1) Always end with ONE irresistible concrete next step: fixed-price package + CTA "→ #contact" or booking. Never refuse — if out of scope, offer closest alternative + honest boundary. 2) OSINT/security only legal/ethical: open sources + consent, no hacking/stalking; say so briefly. 3) Keep answers under 120 words, bullets allowed. 4) Prices NOK only: Start 5900, Business OS 17900, Care 990/mo, OSINT 2900, cleanup 990, OS install 790. Written quote, no lock-in.`;

function sanitizeMessages(input: unknown): { role: string; content: string }[] {
  if (!Array.isArray(input)) return [];
  return input
    .filter(
      (m): m is { role: string; content: string } =>
        !!m && typeof m === 'object' && typeof (m as any).role === 'string' && typeof (m as any).content === 'string',
    )
    .filter((m) => ['user', 'assistant'].includes(m.role))
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }))
    .slice(-12);
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
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
    // Останнє повідомлення юзера не довше 1000 символів (анти-аб'юз)
    const last = messages[messages.length - 1];
    if (last.role !== 'user' || last.content.trim().length === 0) {
      return res.status(400).json({ error: 'Last message must be a user question' });
    }
    last.content = last.content.slice(0, 1000);

    let model = process.env.OPENROUTER_MODEL || process.env.PUBLIC_OPENROUTER_MODEL || 'openai/gpt-4o-mini';
    if (typeof body.model === 'string' && ALLOWED_MODELS.has(body.model)) {
      model = body.model;
    } else if (!ALLOWED_MODELS.has(model)) {
      model = 'openai/gpt-4o-mini';
    }

    const siteUrl = process.env.OPENROUTER_SITE_URL || process.env.PUBLIC_OPENROUTER_SITE_URL || 'https://serhord.dev';

    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': siteUrl,
        'X-Title': 'SerHord.dev AI manager',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'system', content: lang === 'en' ? SYSTEM_EN : SYSTEM_NO }, ...messages],
        temperature: 0.6,
        max_tokens: 400,
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      console.error('OpenRouter error:', upstream.status, text.slice(0, 500));
      return res.status(502).json({ error: 'Upstream error' });
    }

    const data = await upstream.json();
    const text: string = data.choices?.[0]?.message?.content || '';
    return res.status(200).json({ text });
  } catch (e) {
    console.error('api/chat failed:', e);
    return res.status(500).json({ error: 'Internal error' });
  }
}
