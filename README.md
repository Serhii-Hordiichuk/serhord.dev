# SerHord Framework

Production-ready business website framework for AI-assisted development. Built with vanilla JS, CSS custom properties, and JSON-based i18n.

## Features

- **5 Languages** (UK, EN, NO, ZH, AR) with RTL support
- **Dark/Light theme** with system preference detection
- **Component-based CSS** with design tokens
- **IntersectionObserver** animations & counters
- **Accessible** forms, modals, FAQ, cookie consent
- **Zero dependencies** (vanilla JS + CSS only)
- **Vite** for dev/prod builds

## Quick Start

```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
├── index.html          # Main HTML entry
├── style.css           # Complete design system
├── script.js           # All JS logic (i18n, theme, UI, forms, calc)
├── vite.config.js      # Build config
├── package.json        # Scripts & deps
├── locales/            # Translation JSON files
│   ├── uk.json
│   ├── en.json
│   ├── no.json
│   ├── zh.json
│   └── ar.json
└── dist/               # Production output (after build)
```

## Configuration

### Site Config (script.js)
Edit the `CONFIG` object at top of `script.js`:
```js
const CONFIG = {
  brand: 'SerHord',
  contact: {
    email: 'hello@serhord.dev',
    phone: '+47xxxxxxxxx',
    location: 'Norway',
    telegram: 'serhord',
    github: 'serhord'
  },
  pricing: { ... },
  calculator: { ... }
};
```

### Adding Languages
1. Create `locales/xx.json` with all translation keys
2. Add to `LANGS` array in `script.js`
3. Add RTL support in CSS if needed

### Theming
Modify CSS custom properties in `:root` and `[data-theme="dark"]` in `style.css`.

## AI-Friendly Patterns

- **Data attributes** for all dynamic content (`data-i18n`, `data-count`, `data-modal`)
- **Single state object** for calculator (`state = {type, design, extras[]}`)
- **Event delegation** for dynamic elements
- **No framework lock-in** - vanilla JS/CSS

## Browser Support

- Modern browsers (last 2 versions)
- No IE11 support
- Requires ES2020+ (optional chaining, nullish coalescing)

## License

MIT