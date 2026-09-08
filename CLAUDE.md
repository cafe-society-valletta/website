# Café Society Valletta — website

The official website for Café Society Valletta, a bar on 13 St John Street, Valletta, Malta.

## Project structure

Static, 7-page HTML site. No build step, no package manager, no framework.

```
index.html       Home
about.html        About
events.html       Events (upcoming/past toggle)
gallery.html      Photo gallery (filter + lightbox)
lostsouls.html    Lost Souls Club
shop.html         The Society Collection (product category grid)
board.html        Meet Me at Society (message board — login/post, localStorage only)

assets/css/style.css   Single stylesheet for all 7 pages. Mobile layout (<700px) matches
                        the Paper design exactly; tablet (≥700px) and desktop (≥1100px)
                        breakpoints extend the same system to wider viewports.
assets/js/main.js      Shared modal open/close + toast helpers.
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
