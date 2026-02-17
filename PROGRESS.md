# Progress

## Current Phase
Phase 1 — Auth & API Client (In Progress)

## Completed
### Phase 0 — Repository & Project Bootstrap
- [x] GitHub repo created (`NTurner20/xcode-cloud-vscode`)
- [x] Project scaffold with full directory structure
- [x] `package.json` with all contributes (commands, views, menus, configuration)
- [x] TypeScript strict mode, ESLint, commitlint + husky
- [x] CI workflow — lint, typecheck, test, build — all green
- [x] Release workflow — package, publish, GitHub release skeleton
- [x] PR template
- [x] Branch protection via rulesets (requires PR + status checks)
- [x] Initial commit pushed, CI passing

## In Progress
- [ ] JWT authentication with ES256 signing
- [ ] SecretStorage for credentials
- [ ] Typed API client for Xcode Cloud endpoints

## Up Next
- Phase 2 — Tree View & Sidebar
- Phase 3 — Commands & Build Management
- Phase 4 — Log Viewing
- Phase 5 — Notifications & Status Bar
- Phase 6 — CI/CD Hardening

## Known Issues / Blockers
- None

## Architecture Decisions
- `rootDir: "."` so tests compile alongside source (`out/src/`, `out/test/`)
- Main entry point: `./out/src/extension.js`
- Test runner placeholder exits cleanly until Phase 6
- `jsonwebtoken` is the only runtime dependency (for ES256 JWT signing)
- Using native `fetch` (Node 18+) for HTTP — no axios/got
