# Mary Gold — Dynamic Website with Admin Panel

A multi-page website for **Mary Gold** (*YBIYTC — Your Best Is Yet To Come*) with a
**Git-based Admin Panel** so you can edit all content, team, programs, events and
images without touching code — **hosted free on Netlify**.

- Phone: **08189667096** · WhatsApp: **+234 818 966 7096**
- Email: **onweebi12@gmail.com**
- Address: House 23, Mosaic Garden Estate, Gaduwa District, Abuja

---

## How it works (architecture)

This is a **static site** (perfect for Netlify's free tier) whose content lives in
plain JSON files under `content/`. A built-in **Decap CMS** admin panel (`/admin`)
edits those files and, on save, **commits them to your Git repository**. Netlify
then rebuilds and publishes automatically.

```
You edit in /admin  ──►  Decap CMS  ──►  Git commit (content/*.json + uploads/)
                                              │
                                              ▼
                                   Netlify auto-deploys
                                              │
                                              ▼
                        Public pages fetch content JSON and render it
```

- **No database, no server** → runs on Netlify free.
- **Rich-text editor** (bold, italic, underline, colours, lists, links, images)
  for biographies and long text.
- **Media library** for uploading/replacing images (logo, team photos, etc.).
- **Contact + newsletter messages** are captured by **Netlify Forms** and viewed
  in your Netlify dashboard under **Forms**.
- **WhatsApp floating button** on every page using your phone number.

## Clean URLs

| Page     | URL         |
|----------|-------------|
| Home     | `/`         |
| About    | `/about`    |
| Programs | `/programs` |
| Events   | `/events`   |
| Contact  | `/contact`  |
| Admin    | `/admin/`   |

---

## Run locally

```bash
cd mary-ybiytc-web
python3 scripts/dev.py          # http://localhost:8000
# or a custom port:
python3 scripts/dev.py 5000
```

Open **http://localhost:8000**. Clean URLs work locally too.

> Note: The `/admin` panel signs in through **GitHub → Netlify OAuth**, so login
> only works once the site is deployed and the OAuth provider is installed
> (see step 3 below). Use the local preview for the public pages.

---

## Deploy to Netlify (free) — step by step

**Live site:** <https://marygoldtech-ybiytc.netlify.app> ·
**Admin panel:** <https://marygoldtech-ybiytc.netlify.app/admin/>

### 1. Put the project on GitHub
```bash
cd /home/kali/Downloads/mary-ybiytc-web
git remote add origin https://github.com/<you>/mary-gold.git
git push -u origin main
```
Then set the repo path in the CMS config (one line):
```bash
sed -i "s|your-github-username/mary-gold|<your-username>/mary-gold|" admin/config.yml
git commit -am "Set CMS GitHub repo" && git push
```

### 2. Create the Netlify site
1. Go to https://app.netlify.com → **Add new site → Import an existing project**.
2. Connect GitHub and pick your repo.
3. Build settings are read from `netlify.toml`:
   - build command = `bash scripts/build.sh`
   - publish directory = `dist`
4. Deploy.

> Deploying from the CLI instead? The site is already linked:
> ```bash
> netlify deploy --prod
> ```

### 3. Enable GitHub login for the Admin panel
The CMS uses the **`github`** backend (`admin/config.yml`), so editors sign in with
their GitHub account. GitHub requires a server for OAuth, so Netlify proxies it.

1. **Register a GitHub OAuth app**
   - Go to https://github.com/settings/developers → **OAuth Apps → New OAuth App**.
   - **Authorization callback URL**: `https://api.netlify.com/auth/done`
     (this exact string is required).
   - Copy the **Client ID** and generate a **Client Secret**.

2. **Install the provider in Netlify**
   - **Site configuration → Security → OAuth → Authentication Providers → Install Provider**.
   - Choose **GitHub**, paste the Client ID and Client Secret, save.

3. **Grant access**
   - Everyone who should use the CMS needs a GitHub account with **push access**
     to the repo (**Settings → Collaborators** on the repo, or a team/role).

> Netlify Identity is also enabled on the site (it powers the login widget on the
> public pages) and should be set to **Registration: Invite only** under
> **Site configuration → Identity**, so nobody can self-register.

### 4. Log in and edit
1. Visit `https://marygoldtech-ybiytc.netlify.app/admin/`.
2. Click **Login with GitHub** and authorise the app.
3. You now have the full admin panel:
   - **Site Settings** — logo, phone, WhatsApp, email, address, socials, footer.
   - **Pages** — Home, About, Programs, Events, Contact text.
   - **Founder & Trustees** — add/edit/delete board members, founder profile.
   - **Programs** — add/edit/delete programs (icon, summary, bullets, button).
   - **Events** — event types and upcoming/past event listings.
   - **FAQ** and **Testimonials**.
4. Click **Save**. Your change is committed and the site updates in ~1 minute.

> Content is saved in an **editorial workflow**: Save → *Ready* → **Publish**.
> After saving, open the entry and click **Publish** to push it live.

---

## Contact form messages

Your contact form and newsletter form are wired as **Netlify Forms**.

- View submissions in Netlify: **Site → Forms** (`contact`, `newsletter`).
- Optional: **Forms → Settings → Form notifications** to email you on each
  submission (uses Netlify's email notifications, free).

---

## Editing content directly (advanced)

Everything also lives in readable JSON:

```
content/
├── site/settings.json      # logo, phone, email, address, socials, hours
├── pages/home.json         # hero slides + home text
├── pages/about.json        # about page headings/text
├── pages/programs.json     # programs page headings/text
├── pages/events.json       # events page headings/text
├── pages/contact.json      # contact page headings
├── pages/objectives.json   # objectives list
├── pages/values.json       # core values list
├── founder.json            # founder profile
├── team.json               # trustees/board members
├── programs.json           # all 6 programs
├── events.json             # event types + upcoming/past events
├── faq.json                # FAQs
└── testimonials.json       # testimonials
```

The public pages (`index.html`, `about.html`, …) fetch these files at load time
via `assets/js/content.js`, `assets/js/render-common.js`, and
`assets/js/pages.js`, then fill the existing markup. **The visual design is
unchanged** — only text/images/data come from the JSON.

Images uploaded via the CMS are stored in `uploads/`. The site logo is set in
**Site Settings → Logo**.

---

## Project structure

```
.
├── index.html, about.html, programs.html, events.html, contact.html, 404.html
├── admin/                  # Decap CMS (admin panel)
│   ├── index.html
│   └── config.yml
├── assets/
│   ├── css/cms.css         # WhatsApp button + admin runtime styles
│   └── js/                 # content.js, render-common.js, pages.js
├── content/                # ALL editable content (JSON)
├── uploads/                # CMS-uploaded images
├── images/                 # original images
├── js/main.js              # shared interactions (menu, sliders, forms, modals)
├── scripts/
│   ├── build.sh            # assembles the deployable site into dist/
│   └── dev.py              # local dev server with clean URLs
├── dist/                   # build output (published, git-ignored)
└── netlify.toml            # Netlify config (clean URLs, admin, headers)
```

---

## Notes

- Design, colours, fonts and layout are **unchanged** from the original.
- The site works **offline / without JS** for the original hard-coded content;
  CMS content loads progressively and replaces it.
- If the logo is missing, a styled **"Mary Gold"** text fallback is shown.
- **CMS backend:** `admin/config.yml` uses `backend: name: github`. Change the
  `repo:` value from `your-github-username/mary-gold` to your real
  `<username>/<repo>` path — the CMS cannot save until you do. Git Gateway was
  chosen originally but Netlify has deprecated it.
