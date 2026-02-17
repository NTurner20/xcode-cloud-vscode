# Progress

## Current Phase
Phase 2 — Tree View & Sidebar (Complete)

## Completed
### Phase 0 — Repository & Project Bootstrap
- [x] GitHub repo, CI/CD workflows, branch protection, initial commit

### Phase 1 — Auth & API Client
- [x] JWT (ES256) auth with .p8 private key
- [x] SecretStorage for credentials
- [x] Typed API client for all Xcode Cloud endpoints
- [x] Centralized error handling
- [x] PR #1 merged

### Phase 2 — Tree View & Sidebar
- [x] BuildTreeProvider with Products → Workflows → Build Runs
- [x] Status icons for build states
- [x] Metadata in descriptions/tooltips (branch, duration, commit)
- [x] Poller with configurable interval and exponential backoff
- [x] Visibility-aware polling (only when sidebar visible)
- [x] Last refreshed timestamp in status bar
- [x] Manual refresh button
- [x] Context menus with contextValue for actions

## In Progress
- None

## Up Next
- Phase 3 — Commands & Build Management
- Phase 4 — Log Viewing
- Phase 5 — Notifications & Status Bar
- Phase 6 — CI/CD Hardening

## Known Issues / Blockers
- None

## Architecture Decisions
- `rootDir: "."` so tests compile alongside source (`out/src/`, `out/test/`)
- Main entry point: `./out/src/extension.js`
- `jsonwebtoken` is the only runtime dependency (for ES256 JWT signing)
- Using native `fetch` (Node 18+) for HTTP — no axios/got
- BuildTreeItem extends vscode.TreeItem with typed itemType and attached data
- Poller uses setTimeout chain (not setInterval) for backoff compatibility
- Tree view shows products expanded by default, workflows collapsed
