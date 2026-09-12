/* ============================================
   SerHord.dev — Main script
   i18n via JSON · 5 languages · RTL support
   ============================================ */
(() => {
  "use strict";

  /* ---------- Helpers ---------- */
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get(k, d = null) {
      try {
        return JSON.parse(localStorage.getItem(k)) ?? d;
      } catch {
        return d;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch {}
    },
  };
  const throttle = (fn, ms = 100) => {
    let w = false;
    return (...a) => {
      if (!w) {
        fn(...a);
        w = true;
        setTimeout(() => (w = false), ms);
      }
    };
  };
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const isPhone = (v) => /^\+?[\d\s\-()]{8,}$/.test(v.replace(/\s/g, ""));

  /* ---------- Body lock ---------- */
  let lockY = 0;
  const lock = () => {
    lockY = window.scrollY;
    document.body.style.top = `-${lockY}px`;
    document.body.classList.add("lock");
  };
  const unlock = () => {
    document.body.classList.remove("lock");
    document.body.style.top = "";
    window.scrollTo(0, lockY);
  };

  /* ============================================
   I18N
   ============================================ */
  const LANGS = [
    { code: "uk", label: "UK", dir: "ltr" },
    { code: "en", label: "EN", dir: "ltr" },
    { code: "no", label: "NO", dir: "ltr" },
    { code: "zh", label: "中文", dir: "ltr" },
    { code: "ar", label: "AR", dir: "rtl" },
  ];
  const DEFAULT_LANG = "uk";
  const CACHE_KEY = "i18n_cache_v1";

  const i18n = {
    lang: DEFAULT_LANG,
    data: {},
    fallback: {},

    async load(lang) {
      if (!LANGS.some((l) => l.code === lang)) lang = DEFAULT_LANG;

      const cache = store.get(CACHE_KEY, {});

      if (cache[lang]) {
        this.data = cache[lang];
      } else {
        try {
          const res = await fetch(`locales/${lang}.json`);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          this.data = await res.json();
          cache[lang] = this.data;
          store.set(CACHE_KEY, cache);
        } catch (e) {
          console.warn(`Locale "${lang}" failed:`, e);
          this.data = {};
        }
      }

      // Fallback always to DEFAULT_LANG
      if (lang !== DEFAULT_LANG) {
        if (cache[DEFAULT_LANG]) {
          this.fallback = cache[DEFAULT_LANG];
        } else {
          try {
            const res = await fetch(`locales/${DEFAULT_LANG}.json`);
            this.fallback = await res.json();
            cache[DEFAULT_LANG] = this.fallback;
            store.set(CACHE_KEY, cache);
          } catch {
            this.fallback = {};
          }
        }
      } else {
        this.fallback = this.data;
      }

      this.lang = lang;
      this.applyDirection(lang);
      this.apply();
      renderLangs();
      store.set("lang", lang);
    },

    t(key) {
      return this.data[key] ?? this.fallback[key] ?? key;
    },

    apply() {
      $$("[data-i18n]").forEach((el) => {
        const v = this.t(el.dataset.i18n);
        if (v && v !== el.dataset.i18n) el.textContent = v;
      });
      document.documentElement.lang = this.lang;
    },

    applyDirection(lang) {
      const meta = LANGS.find((l) => l.code === lang);
      const dir = meta?.dir || "ltr";
      document.documentElement.setAttribute("dir", dir);
    },
  };

  function renderLangs() {
    const el = $("#langs");
    if (!el) return;
    el.innerHTML = LANGS.map(
      (l) =>
        `<button data-lang="${l.code}" class="${l.code === i18n.lang ? "active" : ""}" aria-label="${l.code}" type="button">${l.label}</button>`,
    ).join("");
    $$("button", el).forEach((b) =>
      b.addEventListener("click", () => i18n.load(b.dataset.lang)),
    );
  }

  /* ============================================
   TOAST
   ============================================ */
  function toast(msg, type = "info") {
    let box = $(".toast-box");
    if (!box) {
      box = document.createElement("div");
      box.className = "toast-box";
      document.body.appendChild(box);
    }
    const iconId =
      type === "success" ? "i-check" : type === "error" ? "i-alert" : "i-info";
    const titleKey =
      type === "success"
        ? "toast.ok"
        : type === "error"
          ? "toast.err"
          : "toast.info";
    const title = i18n.t(titleKey);
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `
    <div class="toast__icon"><svg class="icon"><use href="#${iconId}"/></svg></div>
    <div class="toast__body">
      <div class="toast__title">${title}</div>
      <div class="toast__msg">${msg}</div>
    </div>
    <button class="toast__close" aria-label="Close" type="button"><svg class="icon icon--sm"><use href="#i-close"/></svg></button>
  `;
    box.appendChild(el);
    const rm = () => {
      el.classList.add("remove");
      setTimeout(() => el.remove(), 250);
    };
    $(".toast__close", el).addEventListener("click", rm);
    setTimeout(rm, 4000);
  }

  /* ============================================
   THEME
   ============================================ */
  function initTheme() {
    const btn = $("#theme");
    const icon = $("#themeIcon");
    if (!btn || !icon) return;

    const apply = (t) => {
      document.documentElement.setAttribute("data-theme", t);
      icon
        .querySelector("use")
        .setAttribute("href", t === "dark" ? "#i-sun" : "#i-moon");
      store.set("theme", t);
    };

    const saved = store.get("theme");
    const sys = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    apply(saved || sys);

    btn.addEventListener("click", () => {
      const now = document.documentElement.getAttribute("data-theme");
      apply(now === "dark" ? "light" : "dark");
    });
  }

  /* ============================================
   HEADER + BURGER
   ============================================ */
  function initHeader() {
    const header = $("#header");
    if (header) {
      const onScroll = throttle(
        () => header.classList.toggle("scrolled", window.scrollY > 20),
        100,
      );
      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    const burger = $("#burger");
    const menu = $("#menu");
    if (!burger || !menu) return;

    burger.addEventListener("click", () => {
      const open = burger.classList.toggle("active");
      menu.classList.toggle("open", open);
      if (open) lock();
      else unlock();
    });

    $$("a", menu).forEach((a) =>
      a.addEventListener("click", () => {
        burger.classList.remove("active");
        menu.classList.remove("open");
        unlock();
      }),
    );
  }

  /* ============================================
   SCROLL UI
   ============================================ */
  function initScrollUI() {
    const bar = $("#progress");
    const top = $("#toTop");
    const onScroll = throttle(() => {
      const st = window.scrollY;
      const dh = document.documentElement.scrollHeight - window.innerHeight;
      if (bar) bar.style.width = (dh > 0 ? (st / dh) * 100 : 0) + "%";
      if (top) top.classList.toggle("visible", st > 600);
    }, 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    if (top)
      top.addEventListener("click", () =>
        window.scrollTo({ top: 0, behavior: "smooth" }),
      );
    onScroll();
  }

  /* ============================================
   REVEAL + COUNTERS
   ============================================ */
  function initReveal() {
    if (!("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e, i) => {
          if (e.isIntersecting) {
            setTimeout(
              () => e.target.classList.add("visible"),
              Math.min(i * 60, 300),
            );
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" },
    );

    $$(".section, .hero").forEach((s) => s.classList.add("reveal"));
    $$(".reveal").forEach((el) => io.observe(el));
  }

  function initCounters() {
    const counters = $$("[data-count]");
    if (!counters.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const el = e.target;
          const target = +el.dataset.count;
          const dur = 1200;
          const start = performance.now();
          const tick = (now) => {
            const p = Math.min((now - start) / dur, 1);
            el.textContent = Math.floor(target * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
          io.unobserve(el);
        });
      },
      { threshold: 0.5 },
    );
    counters.forEach((c) => io.observe(c));
  }

  /* ============================================
   FAQ
   ============================================ */
  function initFAQ() {
    const items = $$(".faq-item");
    items.forEach((item) => {
      const q = $(".faq-q", item);
      const a = $(".faq-a", item);
      if (!q || !a) return;
      q.addEventListener("click", () => {
        const open = item.classList.contains("open");
        items.forEach((i) => {
          i.classList.remove("open");
          const ai = $(".faq-a", i);
          if (ai) ai.style.maxHeight = null;
        });
        if (!open) {
          item.classList.add("open");
          a.style.maxHeight = a.scrollHeight + "px";
        }
      });
    });
  }

  /* ============================================
   MODAL
   ============================================ */
  function initModal() {
    const modal = $("#modal");
    if (!modal) return;

    const open = () => {
      modal.classList.add("open");
      lock();
    };
    const close = () => {
      modal.classList.remove("open");
      unlock();
    };

    $$("[data-modal]").forEach((b) => b.addEventListener("click", open));
    $$("[data-close]").forEach((b) => b.addEventListener("click", close));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) close();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) close();
    });

    const form = $("#modalForm");
    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const btn = $('button[type="submit"]', e.target);
        btn.disabled = true;
        await new Promise((r) => setTimeout(r, 800));
        toast(i18n.t("modal.ok"), "success");
        e.target.reset();
        btn.disabled = false;
        close();
      });
    }
  }

  /* ============================================
   FORMS
   ============================================ */
  function initForms() {
    const form = $("#contactForm");
    if (!form) return;

    const rules = {
      name: (v) =>
        !v.trim()
          ? i18n.t("form.req")
          : v.trim().length < 2
            ? i18n.t("form.min")
            : "",
      phone: (v) =>
        !v.trim() ? i18n.t("form.req") : !isPhone(v) ? i18n.t("form.ph") : "",
      email: (v) =>
        !v.trim() ? i18n.t("form.req") : !isEmail(v) ? i18n.t("form.em") : "",
      message: (v) =>
        !v.trim()
          ? i18n.t("form.req")
          : v.trim().length < 10
            ? i18n.t("form.msgmin")
            : "",
    };

    const validate = (input) => {
      const rule = rules[input.name];
      if (!rule) return "";
      const err = rule(input.value);
      input.classList.toggle("error", !!err);
      const errEl = input.parentElement.querySelector(".form__err");
      if (errEl) errEl.textContent = err;
      return err;
    };

    $$("input, textarea", form).forEach((i) => {
      i.addEventListener("blur", () => validate(i));
      i.addEventListener("input", () => {
        if (i.classList.contains("error")) validate(i);
      });
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      let valid = true;
      $$("input, textarea", form).forEach((i) => {
        if (validate(i)) valid = false;
      });
      if (!valid) {
        toast(i18n.t("form.bad"), "error");
        return;
      }

      const btn = $('button[type="submit"]', form);
      const orig = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML =
        '<svg class="icon"><use href="#i-mail"/></svg><span>...</span>';
      await new Promise((r) => setTimeout(r, 1200));
      toast(i18n.t("form.ok"), "success");
      form.reset();
      btn.disabled = false;
      btn.innerHTML = orig;
    });

    const nl = $("#newsForm");
    if (nl) {
      nl.addEventListener("submit", async (e) => {
        e.preventDefault();
        const input = $("input", nl);
        if (!isEmail(input.value)) {
          toast(i18n.t("sub.bad"), "error");
          return;
        }
        const btn = $("button", nl);
        btn.disabled = true;
        await new Promise((r) => setTimeout(r, 800));
        toast(i18n.t("sub.ok"), "success");
        nl.reset();
        btn.disabled = false;
      });
    }
  }

  /* ============================================
   CALCULATOR
   ============================================ */
  function initCalc() {
    const box = $("#calcBox");
    if (!box) return;

    const PRICES = {
      type: { landing: 8000, multi: 16000, shop: 25000 },
      design: { template: 0, custom: 5000 },
      extras: { seo: 3000, ai: 8000, crm: 3500, pay: 2500 },
    };

    const state = { type: "landing", design: "template", extras: [] };
    const totalEl = $("#calcTotal");

    const total = () => {
      let t = PRICES.type[state.type] || 0;
      t += PRICES.design[state.design] || 0;
      state.extras.forEach((e) => (t += PRICES.extras[e] || 0));
      return t;
    };
    const render = () => {
      if (totalEl) totalEl.textContent = total().toLocaleString("uk-UA") + " ₴";
    };

    box.addEventListener("click", (e) => {
      const opt = e.target.closest(".calc__opt");
      if (!opt) return;
      const g = opt.dataset.g;
      const v = opt.dataset.v;

      if (g === "extras") {
        const idx = state.extras.indexOf(v);
        if (idx > -1) state.extras.splice(idx, 1);
        else state.extras.push(v);
        opt.classList.toggle("active");
      } else {
        state[g] = v;
        $$(`.calc__opt[data-g="${g}"]`, box).forEach((o) =>
          o.classList.toggle("active", o === opt),
        );
      }
      render();
    });

    render();
  }

  /* ============================================
   COOKIE
   ============================================ */
  function initCookie() {
    const banner = $("#cookie");
    if (!banner) return;
    const KEY = "cookie_v1";
    if (store.get(KEY)) {
      banner.remove();
      return;
    }
    setTimeout(() => banner.classList.add("show"), 1500);

    $$("[data-cookie]", banner).forEach((btn) => {
      btn.addEventListener("click", () => {
        store.set(KEY, { action: btn.dataset.cookie, ts: Date.now() });
        banner.classList.remove("show");
        setTimeout(() => banner.remove(), 400);
        if (btn.dataset.cookie === "yes") toast(i18n.t("cookie.ok"), "success");
      });
    });
  }

  /* ============================================
   INIT
   ============================================ */
  document.addEventListener("DOMContentLoaded", async () => {
    initTheme();
    initHeader();
    initScrollUI();
    initReveal();
    initCounters();
    initFAQ();
    initModal();
    initForms();
    initCalc();
    initCookie();

    // i18n (async — last)
    const saved = store.get("lang");
    const browser = (navigator.language || "uk").slice(0, 2);
    const initial =
      saved || (LANGS.some((l) => l.code === browser) ? browser : DEFAULT_LANG);
    await i18n.load(initial);

    console.log(
      "%c SerHord.dev · loaded · 5 langs ",
      "background:#0b0f19;color:#fff;padding:4px 8px;border-radius:4px;font-weight:600",
    );
  });
})();
