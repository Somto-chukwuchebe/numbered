# Numbered

*“So teach us to number our days that we may get a heart of wisdom.”* — Psalm 90:12

A private, offline personal-development tracker. Log daily effort across a few focus areas, tick daily habits, and watch the investment build across a time-bound challenge.

**No backend. No account. No tracking.** The whole app is one static HTML file, and everything you log stays in your own browser's `localStorage`. Nothing is ever sent anywhere — including to this repository.

---

## Use it

Open the published site, or download `index.html` and double-click it. Both work offline.

First open walks you through a short setup: name the challenge, set the dates, define 1–5 focus areas and your daily habits. All of it is editable later in Settings.

**Install to your phone:** open the published site on your phone → Share → *Add to Home Screen*. It runs full screen and works offline.

---

## A note on your data

`localStorage` is scoped per browser, per origin. That means:

- Your data survives refreshes, closing the tab and restarting your machine.
- It does **not** survive clearing site data, and it does **not** follow you between devices or browsers — each one keeps a separate log, even on the same URL.

So export a backup from **Settings → Export backup (JSON)** regularly, and use it to move between devices.

**Import replaces; it does not merge.** If you log on two devices in the same week, importing one over the other discards the other's entries. Treat one device as your source of truth.

---

## Deploy it

The published site is the repository root — `index.html`, `sw.js`, `manifest.json`, `icon.svg`. There is no build step on the server, so any static host works.

**GitHub Pages:** Settings → Pages → Source: *Deploy from a branch* → `main` / `/ (root)`. Live in a minute or two at `https://<user>.github.io/<repo>/`.

**Netlify / Cloudflare Pages / Vercel:** connect this repository, leave the build command empty, set the publish directory to `/`. All three deploy from the repo, so moving host later is a five-minute job and the repo stays the source of truth.

**Custom domain:** point DNS at your host and set the domain in its dashboard. HTTPS is issued automatically on all of the above.

`.nojekyll` is present so GitHub Pages serves the files as-is.

---

## Develop it

```bash
npm install
npm run build    # bundles src/ into index.html
npm test         # 37 checks in headless Chromium
```

`build.mjs` inlines React, Recharts, every stylesheet and the icon into a single `index.html` — which is why it runs with no network at all. Commit the rebuilt `index.html` along with your source changes; that file *is* the deployment.

```
src/
  App.jsx            shell, nav, theme
  lib/               state, persistence, date maths, derived stats, brand
  components/        screens (Dashboard, Daily, Habits, Insights, Settings, Wizard)
build.mjs            bundle + inline → index.html
test/run.mjs         Playwright suite
```

---

## Licence

No licence is declared, so default copyright applies: all rights reserved. Add a `LICENSE` file if you want to let others reuse the code.
