# Connect tahsintazwar.com (hostsheba) → GitHub Pages

Your domain is registered at **hostsheba.com** (DNS only) and the site is hosted **free on GitHub Pages**.
Three stages: (1) get the repo on GitHub, (2) set DNS at hostsheba, (3) turn on the custom domain in GitHub.

The repo already contains a `CNAME` file with `tahsintazwar.com` — don't delete it; GitHub Pages needs it.

---

## Stage 1 — Get the repo onto GitHub

Pick either:

**A. Web upload (no tools):** github.com → **New repository** (e.g. `portfolio`) → on the empty repo click
**uploading an existing file** → drag in ALL files/folders (including `assets`, `.github`, and `CNAME`) → Commit.

**B. git CLI (on a machine with git):**
```bash
git init
git add .
git commit -m "Portfolio: Tahsin Tazwar, Co-Founder of Outsource to BD"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

Then enable Pages: **repo → Settings → Pages → Build and deployment → Source: GitHub Actions**.
The included workflow deploys automatically. Confirm the site works at `https://tahsinapac-ops.github.io/<repo-name>/` first.

> **Tip:** if you name the repo exactly `tahsinapac-ops.github.io`, it becomes your GitHub *user site* served at
> `https://tahsinapac-ops.github.io/` with no `/<repo-name>/` sub-path — cleanest pairing with the custom domain.

---

## Stage 2 — Set DNS at hostsheba

Log in to the **hostsheba client area → My Domains → Manage `tahsintazwar.com` → DNS Management**
(or **cPanel → Zone Editor** if your DNS is hosted there). Make sure the domain is using **hostsheba's
default nameservers** so these records take effect.

Add these records:

### Apex domain (tahsintazwar.com) — four A records
| Type | Name/Host | Value | TTL |
|------|-----------|-------|-----|
| A | `@` | `185.199.108.153` | 3600 |
| A | `@` | `185.199.109.153` | 3600 |
| A | `@` | `185.199.110.153` | 3600 |
| A | `@` | `185.199.111.153` | 3600 |

*(Optional but recommended — IPv6 AAAA records, same `@` host):*
`2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`

### www subdomain — one CNAME
| Type | Name/Host | Value | TTL |
|------|-----------|-------|-----|
| CNAME | `www` | `tahsinapac-ops.github.io.` | 3600 |

> GitHub username: **tahsinapac-ops**. Some panels want a trailing dot; some don't — follow hostsheba's format.
> If hostsheba auto-created a parking A record or `www` record, delete the old ones so they don't conflict.

DNS can take from a few minutes up to ~24 hours to propagate.

---

## Stage 3 — Turn on the custom domain in GitHub

1. **Repo → Settings → Pages → Custom domain** → enter `tahsintazwar.com` → **Save**.
   (The `CNAME` file already sets this; entering it triggers GitHub's DNS check.)
2. Wait for the green "DNS check successful" tick.
3. Tick **Enforce HTTPS** (appears once the certificate is issued — may take a bit after DNS resolves).

Done: `https://tahsintazwar.com` (and `www.` → redirects to it) serves your portfolio.

---

## Verify DNS (optional)

From any machine with internet:
```bash
nslookup tahsintazwar.com          # should return the four 185.199.108-111.153 IPs
nslookup www.tahsintazwar.com      # should point to tahsinapac-ops.github.io
```
