# Café Society Valletta — website

The official website for Café Society Valletta, a bar on 13 St John Street, Valletta, Malta.

## Project structure

Static, 8-page HTML site. No build step, no package manager, no framework.

```
index.html       Home
about.html        About
events.html       Events (upcoming/past toggle)
gallery.html      Photo Lab — film rolls; a roll with data-gallery opens the same gallery viewer, and its photos get a
                  'Download full res' button (GALLERY_SETS[name].dl = base URL of the originals, hosted off-repo)
lostsouls.html    Lost Souls Club
menu.html         Menu — the printed A5 booklet as a 3D flip book (assets/js/menu.js): closed cover → A4-wide spreads →
                  back cover; pinch-to-zoom on touch screens. Pages = assets/img/menu/menu-NN.jpg (1240px wide) + menu-NN-s.jpg (700px), rendered
                  from the menu PDF; data-pages on #booklet = page count. Missing images show numbered placeholders.
shop.html         The Society Collection — categories open inline in place (product carousel
                  bleeds right); product view = full-bleed swipe photos + info (assets/js/shop.js). Products in
                  assets/js/shop-data.js (PLACEHOLDERS, Shopify-shaped). Plan: Paper/site own the look, Shopify only
                  does bag/checkout + stock. Deep links: shop.html#apparel, shop.html#p/<handle> (e.g. #p/apparel-test-1).
board.html        Meet Me at Society (message board — login/post, localStorage only)

assets/css/style.css   Single stylesheet for all 7 pages. Pages 2–6: phone (<700px) = Paper phone
                        artboards; 700–899px = phone column zoomed; ≥900px = Paper "Desktop 1440"
                        artboards (same layout, one centred 720px column). Rule: menu bar, body and
                        footer always share the same side edges (32px phone / the 720 column desktop).
assets/fonts/          Site font "CS Neutra" (free stand-in for Neutraface Text): Josefin Sans for weights
                        under 350 (thin/light), Jost from Book up. Self-hosted WOFF2, SIL OFL licences included.
assets/js/main.js      Shared helpers + the pages 2–6 menu bar (always visible; transparent bars get a
                        backing on scroll) + About section open/close + About gallery viewer (tile zooms out into a
                        3-wide phone / 5-wide desktop grid of prints). Photo sets + chosen covers live in assets/js/gallery-photos.js (window.GALLERY_SETS; coverCrop = hand-cropped <dir>-cover.jpg).
assets/js/events.js    Events Calendar — month grids generated in JS. Events load LIVE from the "Events"
                        Google Calendar via netlify/functions/events.js; EVENTS is a fallback snapshot, WEEKLY
                        holds the standing Sunday Lost Souls Club.
netlify/functions/events.js  Netlify Function (zero-dependency, no build step): fetches the calendar's PUBLIC iCal
                        feed, returns upcoming events as JSON. Needs the calendar shared publicly with full
                        details. No API key. Event description parsing: Instagram/SoundCloud/Spotify/YouTube/Bandcamp/RA/TikTok
                        URLs → artist icon links ("Name: <url>" groups them by artist); image URL → poster; any other URL →
                        "More info" (short text on its line, e.g. "Tickets:", becomes the label); YouTube/Vimeo → "Watch",
                        cafesocietyvalletta gallery URL → "Photos"; several links allowed. Feed starts 1 Oct 2026 (FIRST_DAY)
                        and keeps all past events (no lifespan yet); past days show faded, kicker "Past event:".
                        Photo Lab deep link: gallery.html#<data-slug> opens that roll (e.g. #qlv-pride).
assets/js/chars.js     Home "Characters" parade frame clock — keeps the line's step and every
                        figure's pose change on the same 1.5 fps frame (one jump per frame).
assets/js/board.js     Message board rendering, seed data, login/post (client-side only —
                        no backend; state is per-browser via localStorage).
assets/img/            Photos. Files prefixed `p-` were pulled directly from the Paper
                        design file's asset URLs; the rest (gallery-*.jpg) are pre-existing
                        site photos used for content the Paper mockups didn't specify
                        (e.g. real event photos vs. their placeholder cards).
```

`index.html` must stay at the repository root — Netlify serves it as-is with no build command.

No package.json, no build tooling. Don't add either without a reason that requires it.

## Publishing workflow

1. **Paper.design** is the visual design source. Design changes happen there first.
2. Design changes get translated into this repo's HTML/CSS/JS, matching the codebase's
   existing conventions rather than pasting Paper's raw export.
3. **GitHub** (`cafe-society-valletta/website`) is the permanent code and version-history
   source. Every change is committed and pushed here.
4. **Netlify** auto-deploys the `main` branch on every push — no manual deploy step.
   Live at `cafesocietyvalletta.com` (custom domain) and `cafesocietyvalletta.netlify.app`.

So the loop is: **edit in Paper → implement in code → commit → push to `main` → Netlify
deploys automatically.** There is no separate "deploy" action beyond pushing to `main`.

## Safety rules

- **Never commit passwords, API keys, private customer information, or credentials.**
- The repository is **public** (Netlify charges for org-owned private repos) — treat
  everything committed here as publicly visible, permanently (git history persists even
  if a file is later removed).
- Don't add a build command or package.json unless the project actually starts needing one.
- Don't redesign or modify the site's design/content unless specifically asked — this repo
  reflects a deliberate design pass matched to the Paper file; unrequested changes should
  not be made opportunistically.

## Local preview

`.claude/launch.json` + `.claude/serve.py` run a local static server for previewing changes
before pushing (used by Claude Code's preview tooling). Both are gitignored — they're local
dev convenience only, not part of the deployed site.
