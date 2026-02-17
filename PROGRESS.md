# Progress

## Current Phase
Phase 6 — CI/CD Hardening (Complete)

## Completed
### Phase 0 — Repository & Project Bootstrap
- [x] GitHub repo, CI/CD workflows, branch protection, initial commit

### Phase 1 — Auth & API Client
- [x] JWT (ES256) auth with .p8 private key, SecretStorage, typed API client
- [x] PR #1 merged

### Phase 2 — Tree View & Sidebar
- [x] BuildTreeProvider, status icons, polling with backoff, context menus
- [x] PR #2 merged

### Phase 3 — Commands & Build Management
- [x] All commands (Sign In/Out, Refresh, Trigger, Cancel, Open in Browser)
- [x] PR #3 merged

### Phase 4 — Log Viewing
- [x] LogContentProvider with xcodecloud-log:// URI, live tailing, syntax highlighting
- [x] PR #4 merged

### Phase 5 — Notifications & Status Bar
- [x] Status bar with running count / last build status
- [x] Notification toasts for state transitions with action buttons
- [x] PR #5 merged

### Phase 6 — CI/CD Hardening
- [x] 36 unit tests (JWT, API errors, poller backoff, tree items)
- [x] Mocha test runner
- [x] release-please for automated changelog and version bumping
- [x] Updated release workflow (release-please → package → publish → GitHub release)
- [x] Marketplace metadata (publisher, icon, categories, keywords, galleryBanner)
- [x] VSIX packages successfully
- [x] .vscodeignore tightened

## In Progress
- None — all phases complete

## Up Next
- None

## Known Issues / Blockers
- VSCE_PAT secret needs to be configured in GitHub repo settings for marketplace publishing
- Icon is a placeholder (solid blue square) — replace with proper branding

## Architecture Decisions
- `rootDir: "."` — tests compile alongside source (`out/src/`, `out/test/`)
- Main entry: `./out/src/extension.js`
- `jsonwebtoken` is the only runtime dependency
- Native `fetch` for HTTP (no axios/got)
- Mocha for unit tests (no VS Code test electron needed for pure logic tests)
- release-please for conventional commit-based releases
