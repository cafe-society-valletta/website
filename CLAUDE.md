# Café Society Valletta — website

The official website for Café Society Valletta, a bar on 13 St John Street, Valletta, Malta.

## Project structure

Static, 8-page HTML site. No build step, no package manager, no framework.

```
index.html       Home
about.html        About
events.html       Events (upcoming/past toggle)
photolab.html     Photo Lab (served at /photolab; old /gallery.html 301s there) — film rolls; a roll with data-gallery opens the same gallery viewer, and its photos get a
                  'Download full res' button (GALLERY_SETS[name].dl = base URL of the originals, hosted off-repo)
lostsouls.html    Lost Souls Club
menu.html         Menu — the printed A5 booklet as a 3D flip book (assets/js/menu.js): closed cover → A4-wide spreads →
                  back cover; pinch-to-zoom on touch screens. Pages = assets/img/menu/menu-NN.jpg (1240px wide) + menu-NN-s.jpg (700px), rendered
                  from the menu PDF; data-pages on #booklet = page count. Missing images show numbered placeholders.
shop.html         The Society Collection — categories open inline in place (product carousel
                  bleeds right); product view = full-bleed swipe photos + info (assets/js/shop.js). Products in
                  assets/js/shop-data.js (PLACEHOLDERS, Shopify-shaped). Plan: Paper/site own the look, Shopify only
                  does bag/checkout + stock. Deep links: shop.html#apparel, shop.html#p/<handle> (e.g. #p/apparel-test-1).
                  Shopify (headless): netlify/functions/shop.mjs reads products from thesocietycollection.myshopify.com via the
                  Storefront API (Netlify env SHOPIFY_STOREFRONT_TOKEN + SHOPIFY_STORE_DOMAIN — never in the repo) and makes the
                  cart at checkout. Collections map to categories by name; products in no matching collection are guessed from product type/title (GUESS in shop.mjs), else Retail. Bag drawer + live products only when the shop is open
                  (SHOP_COMING_SOON false) or at shop.html?preview; otherwise the placeholders show.
meetme.html       Meet Me at Society — UNLISTED (noindex, not in nav), served at /meetme (_redirects sends the old /meetmeatsociety there). Background = the beige
                  computer (assets/img/p-meetme-computer.webp/.png); .mm-screen sits exactly over its green screen for content.
                  The tube plays assets/video/mm-intro[-desk] (once) then mm-idle[-desk] (loop), .mp4 H.264 or .webm VP9, pre-rendered
                  with the glass curve/mask/shading as drop-ins for the screen rectangle.

assets/css/style.css   Single stylesheet for all 7 pages. Pages 2–6: phone (<700px) = Paper phone
                        artboards; 700–899px = phone column zoomed; ≥900px = Paper "Desktop 1440"
                        artboards (same layout, one centred 720px column). Rule: menu bar, body and
                        footer always share the same side edges (32px phone / the 720 column desktop).
assets/fonts/          Site font "CS Neutra" (free stand-in for Neutraface Text): Josefin Sans for weights
                        under 350 (thin/light), Jost from Book up. Self-hosted WOFF2, SIL OFL licences included.
assets/js/main.js      Shared helpers + the pages 2–6 menu bar (always visible; transparent bars get a
                        backing on scroll — HOUSE STYLE (Chef, Oct 2026): every page's bar is clear at the top and a light frost once
                        scrolled: ~20% tint (dark rgba(10,10,10,.2), About paper .2, Collection navy .2) + backdrop blur 1.5px.
                        Use it on any new page too) + About section open/close + About gallery viewer (tile zooms out into a
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
                        Photo Lab deep link: /photolab#<data-slug> opens that roll (e.g. #qlv-pride).
assets/js/grain.js     Film-grain layer (8 tiles in assets/img/grain/, 12 fps, mix-blend screen so only dark areas get grain).
                        REMOVED from all pages on Chef's request (Oct 2026); file kept in case it comes back — re-add
                        <script src="assets/js/grain.js" defer></script> to a page to turn it on.
assets/js/chars.js     Home "Characters" parade frame clock — keeps the line's step and every
                        figure's pose change on the same 1.5 fps frame (one jump per frame).
assets/js/meetme.js    Meet Me at Society board on the green screen. Home: [ WRITE A POST ] button (typing anywhere also opens it)
                        + POST FEED (newest first, rows link to #p/<id>; post pages not built yet). #new = NEW POST screen:
                        NAME (remembered in localStorage "mm-name"), SUBJECT (44 chars = one feed line), POST (5000), PHOTOS
                        (max 4; shrunk in the browser to a JPEG <= 1 MB, long side <= 1600 px). VT323 font.
                        Posts are shared via netlify/functions/meetme.mjs (Netlify Blobs; photos stored as img/<id>-<n>); new posts
                        wait in a queue until approved on mmadmin.html ("SYSOP CONSOLE", unlisted, key = Netlify env MEETME_ADMIN_KEY;
                        shows body + photos; reject/delete also deletes the photos). #p/<id> = POST WINDOW over the feed (email
                        layout FROM/SENT/SUBJ, body, photos in real colour; click a photo = lightbox outside the bent glass), then a
                        reddit-style COMMENTS thread (replies nest; every comment vetted in the SYSOP CONSOLE). The poster's browser
                        keeps an owner key (localStorage "mm-keys") → [ EDIT POST ] (back to the queue) / [ DELETE ] (immediate). Intro: boot prompt typed live, wipe, logo clip.
                        Mouse over the screen = 8-bit green pointer drawn inside the screen (bent by the CRT filter). Touch screens: the curve relaxes to
                        flat while a text box is focused (native caret/handles sit on the flat text), bends back on leaving it. [FULLSCREEN] =
                        flat full-window terminal (screen moved to <body>), <- GO BACK returns.
                        All screen copy is written as the 8-bit terminal would print it (Chef's rule; only exception: photo
                        attachments on posts). Screen content is bent with the same CRT barrel as the clips: SVG
                        feDisplacementMap with assets/img/mm-warp-{phone,desk}.png (sRGB). WebKit (Safari, all iPhone browsers) puts the
                        filter origin at the monitor corner, so meetme.js offsets the map by the screen offset there (found with
                        /meetme?calib). mm-warp2-*.png = abandoned linearRGB attempt, unused.
assets/img/            Photos. Files prefixed `p-` were pulled directly from the Paper
                        design file's asset URLs; the rest (gallery-*.jpg) are pre-existing
                        site photos used for content the Paper mockups didn't specify
                        (e.g. real event photos vs. their placeholder cards).
```

`index.html` must stay at the repository root — Netlify serves it as-is with no build command.

No build tooling. package.json exists ONLY so Netlify installs @netlify/blobs for netlify/functions/meetme.mjs (shop.mjs needs no packages)
(still no build command). Don't add other dependencies without a reason that requires it.

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
