# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

AXCAMP ("리더십 향상 with AI") is a course/learning portal web app. It is a **single-file, dependency-free Node HTTP server** (`server.js`, ~3.9k lines, no Express, `package.json` has no runtime deps) plus a vanilla-JS front end in `public/`. Course content lives as files under `content/axcamp/`. There is a second output path: a static snapshot for GitHub Pages built by `scripts/build-pages.mjs`.

## Commands

```bash
npm install                 # no runtime deps; just sets up
npm start                   # node --watch server.js  → http://localhost:4071/
npm run build:pages -- --base-path /Lets_AX_EXE   # static snapshot → dist-pages/
npm run preview:pages       # preview the static build locally
```

There is **no test suite, linter, or bundler** — the front end is served as-is. `node --watch` auto-restarts on `server.js` changes.

**Port 4071 is a user-protected port.** Do not kill/restart a running server on it. For UI verification, attach Playwright to the user's already-running `npm start` server rather than spawning your own (see `AGENTS.md` for full browser-automation rules, including `headless: false` and login-wait behavior).

## Architecture

### Server (`server.js`)
Raw `http` server. Request dispatch is a flat if-chain in the main handler (search `urlObj.pathname ===` around line ~3685). Key API groups:
- Auth/account: `/api/signup`, `/api/login`, `/api/logout`, `/api/me`, `/api/account`, `/api/password-*`
- Catalog/content: `/api/courses`, `/api/chapters`, `/api/clips/:key`
- Learner state: `/api/progress`, `/api/ax-task`, `/api/notes`
- Admin editing (require `isAdmin`): `/api/admin/users`, `/api/admin/clip-source/*`, `/api/admin/sidebar-source/*`, `/api/admin/clip-assets/*`, `/api/admin/publish[-status]`
- Static files: `/course-files/:courseCode/:clipKey/*` (per-clip assets), `/practice-files/:key` (via `PRACTICE_FILE_MAP`), and `public/` fallthrough.

Users/sessions persist to `data/users.json` (`readDb`/`writeDb`). `data/` is gitignored — it is local runtime state, not content. The first/root user is auto-promoted to admin.

### Content model: course → chapter → clip
- `content/axcamp/chapters/CHxx/` — one folder per chapter, each with a `chapter.json`.
- Each clip folder holds `content.html` (primary render source), `content.md`/`content.txt` (fallbacks), `metadata.json`, and `assets/` or `screenshots/`.
- `content/axcamp/export-report.json` is the course catalog (chapter order + clip list).
- `content/axcamp/visible-catalog-overrides.json` overrides displayed titles/durations/clip names.
- The catalog is compiled by `scripts/compiler.js` (`getCatalog`/`buildCatalog`), cached, and invalidated on edits.

### Visible vs. canonical IDs — important, don't "fix" it
A clip's physical folder/route id can differ from the route id shown to users. Example: the folder is `chapters/CH02/ch02-clip01` but the internal/displayed route may stay `#ch03-clip01`. `server.js` maps between them via `toVisible*` / `toCanonical*` and `rewriteVisibleReferences` / `rewriteCanonicalReferences`. This indirection is intentional — it keeps existing links, saved edits, and the static build stable while folders get reorganized. Treat mismatched-looking IDs as deliberate unless told otherwise.

### Visibility is a rendering layer, not the filesystem
Which chapters/clips appear is controlled by in-memory blueprint maps — `visibleBlueprints` in `server.js` and `CLIENT_CATALOG_BLUEPRINTS` in `public/app.js` — **not** by adding/removing content files. To hide a clip: comment out its blueprint entry and add its key to `HIDDEN_CLIP_KEYS_REDIRECT_SET` (`public/app.js`). **Never physically delete content folders/resources to hide something** — it must stay trivially reversible. Every such edit is tagged with a `[HIDDEN]` marker and a `복구` (restore) comment describing exactly how to bring it back; keep that convention when you touch visibility.

## Project conventions

These are established, enforced patterns for this repo (source: `.agents/rules/karpaty-guidelines.md`, §4 — which also holds general LLM/prompting philosophy worth skimming):

- **Non-destructive iteration.** Hide/exclude via the in-memory blueprint layer above; don't delete originals. Prefer reversible, comment-tagged changes with a documented restore path over hard removals.
- **Defensive routing.** Direct-hash access to a hidden/unknown clip must not throw a 404 — forward to a safe baseline (`HIDDEN_CLIP_KEYS_REDIRECT_SET` → `HIDDEN_REDIRECT_TARGET_CHAPTER_ID`'s first clip; the general fallback baseline is `ch00-clip01`). Preserve this graceful-forward behavior when editing routing.
- **Robust DOM control.** Front-end DOM access (`public/app.js`) uses optional chaining (`?.`) and strict existence checks before deleting/reading nodes (e.g. timetable `<tr>` fixes). Don't assume an element exists — guard it, so a missing node never breaks script execution.

### Root editor save semantics
- **본문 수정 (clip source):** saves `content.html`, then regenerates `content.md`, `content.txt`, and `metadata.json` from it.
- **사이드바 수정 (sidebar source):** updates `visible-catalog-overrides.json`, `export-report.json`, the chapter's `chapter.json`, and the affected clip's `metadata.json`.
Both take effect in the `npm start` runtime and the static build. Edit history is written under `.admin-history/` (gitignored).

### Publish flow
`POST /api/admin/publish` (admin-only) stages **only publishable paths** (`buildPublishableGitChanges` / `isPublishableGitPath` — content/public/scripts/docs/.github + a few root files; excludes `dist-pages/`, `node_modules/`, `.admin-history/`), then `git add`/`commit`/`push origin main`. It refuses if the local branch is behind remote. Pushing `main` triggers `.github/workflows/pages.yml`, which runs `build:pages` and deploys `dist-pages/` to GitHub Pages (`https://dollmao5.github.io/Lets_AX_EXE/`). So the "Publish" button in the UI is a real git push.

### Static build (`scripts/build-pages.mjs`)
Boots a temporary instance of the server on a throwaway port (default 4173), crawls it, and writes `dist-pages/` (`index.html`, `404.html`, `data/chapters.json`, `data/clips/*.json`, copied `assets/`, `course-files/`, `practice-files/`). The static output **disables** login/signup, all root editing/upload, and server-saved learner state; it **keeps** navigation, slide preview/modal/download, media, and practice-file download.

## Reference docs in-repo
`README.md`, `PROJECT_STRUCTURE.md` (folder + chapter↔folder mapping), `AGENTS.md` (browser-automation rules), `content/axcamp/README.md`.
