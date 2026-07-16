# Tahsin Tazwar — Portfolio

Personal portfolio site for **Tahsin Tazwar**, Co-Founder of [Outsource to BD](https://outsourcetobd.com).

> **Vision:** Multiplying Bangladesh's software export — building the trusted gateway between global technology leaders and Bangladesh's engineering talent.

A fast, self-contained static site. **No build step, no dependencies** — just open `index.html`.

## 📁 Structure

```
.
├── index.html            # All page content and structure
├── assets/
│   ├── styles.css        # Design system + layout (dark, premium)
│   ├── script.js         # Nav, scroll reveals, animated stats
│   └── tahsin.jpg        # ← add your photo here (see "Personalize")
├── .github/workflows/
│   └── deploy.yml         # Auto-deploys to GitHub Pages on push to main
└── README.md
```

## 🚀 View it locally

Just double-click `index.html`, or serve it:

```powershell
# Any static server works; example with Python if installed:
python -m http.server 8080
# then open http://localhost:8080
```

## ✏️ Personalize before launch

Everything is plain HTML — search `index.html` for these:

| What | Where |
|------|-------|
| **Your photo** | Add `assets/tahsin.jpg`, then in the `#about` section swap the `<div class="photo-ph">` for `<img src="assets/tahsin.jpg" alt="Tahsin Tazwar" />` |
| **LinkedIn URL** | Replace `https://www.linkedin.com/in/tahsin-tazwar` (appears 3×) with your exact profile URL |
| **Headline stats** | The `data-count` values in the hero (`.hero-stats`). Replace the industry placeholders with your **verified, sourced** numbers |
| **Bio** | The two paragraphs in `#about` marked `<!-- EDIT this bio -->` |
| **Contact** | `contact@outsourcetobd.com` and phone number in `#connect` + footer |

> ⚠️ The hero stats are marked with an on-page footnote as industry placeholders. Replace them with figures you can stand behind before sharing publicly.

## 🌐 Deploy to GitHub Pages

1. Push this repo to GitHub (see push steps below).
2. In your repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) publishes the site on every push to `main`.
4. Your site goes live at `https://tahsinapac-ops.github.io/<repo-name>/`.

To use a custom domain (e.g. `tahsintazwar.com`), add it under **Settings → Pages → Custom domain**.

## 🎨 Design

- **Palette:** deep Bangladesh green + emerald, with warm red/gold accents.
- **Type:** Space Grotesk (headings) + Inter (body), via Google Fonts.
- Fully responsive, accessible, respects `prefers-reduced-motion`.

---

© Tahsin Tazwar · Built to multiply Bangladesh's software export.
