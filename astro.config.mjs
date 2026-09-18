// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://serhord.dev',
  output: 'static',
  i18n: {
    defaultLocale: 'no',
    locales: ['no', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [sitemap({ i18n: { defaultLocale: 'no', locales: { no: 'nb-NO', en: 'en-US' } } })],
  vite: {
    plugins: [tailwindcss()],
  },
});
