# Progress

## Current Phase
Phase 0 — Repository & Project Bootstrap (In Progress)

## Completed
- [x] GitHub repo created (`NTurner20/xcode-cloud-vscode`)
- [x] Project scaffold with full directory structure
- [x] `package.json` with all contributes (commands, views, menus, configuration)
- [x] TypeScript strict mode, ESLint, commitlint + husky
- [x] CI workflow (`.github/workflows/ci.yml`) — lint, typecheck, test, build
- [x] Release workflow (`.github/workflows/release.yml`) — package, publish, GitHub release
- [x] PR template
- [x] All placeholder source files created
- [x] Compile, lint, and test all pass locally

## In Progress
- [ ] Initial commit and push to `main`
- [ ] Branch protection setup

## Up Next
- Phase 1 — Auth & API Client

## Known Issues / Blockers
- None

## Architecture Decisions
- `rootDir` set to `.` (not `src`) so test files compile alongside source into `out/src/` and `out/test/`
- Main entry point: `./out/src/extension.js`
- Test runner exits cleanly with `process.exit(0)` as a placeholder until Phase 6 adds real tests
- Using `jsonwebtoken` for JWT signing (ES256) — only runtime dependency
