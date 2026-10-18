# RoleForge design upgrade release candidate

The staged design upgrade is implemented locally across shared branding/navigation, landing, templates, pricing, login, Projects, Studio, Settings, Help/Support/Status, admin support, and legal/update/error pages. Existing auth, account ownership, billing gates, native support actions, and export contracts remain integrated.

## Verified

- Full CI suite at application commit `10f0ee7`: 688 passed, zero failed; GitHub lint, typecheck, and production build also passed.
- Current production build and focused ESLint pass; diff whitespace check passes.
- Real Google sign-in to localhost, signed-in Projects root, public landing escape, and account Settings.
- One explicitly approved fictional QA run: TXT intake, tailoring, generated materials, PDF/DOCX/TXT downloads, saved project persistence and restore. PDF rendered and visually inspected.
- Approved temporary profile-name save persisted after reload; original name restored and verified after another reload.
- Prior slice evidence covers responsive light/dark surfaces, synthetic failures, keyboard behavior, and mobile performance. See design-completion-audit.md for exact scope.

## Release boundaries

- The user approved committing to a release branch, pushing it, and opening a PR for preview review. Production merge/deployment is not authorized.
- Proposed release includes app/source, regression scripts, public brand assets, next.config.ts and design docs, including the preserved export/demo fixes. Exclude output/, env files, caches, input ZIPs, and downloaded QA files.
- No payment or support email was sent. Local billing/support/admin secrets are intentionally absent; public production reports checkout configuration ready. Actual production billing and support interactions remain separate verification gates.
- The single labeled fictional QA project remains in the user's account.
- Explicitly authorized hosted setup changes: Supabase localhost callback allowlist and Cloud Run CORS for localhost:3100. Cloud Run revision roleforge-api-00073-pbr changed configuration only; backend source is clean.

## Preview release and next step

Published `codex/roleforge-design-upgrade` as [PR #9](https://github.com/agrovr/roleforge-ai/pull/9) against `main`. The release branch incorporates the newer README, CI, and social-preview commits from main. Vercel deployed application commit `10f0ee7` successfully. Chrome checks confirmed the public landing, Pricing navigation/layout, and signed-out Studio gateway; the gateway was reloaded after the latest deployment. The PR review's malformed run-ID finding is fixed with a regression test that preserves recent projects while skipping invalid targeted lookups.

Preview: https://roleforge-ai-git-codex-roleforge-4f2bf3-ashs-projects-e04a172f.vercel.app

Preview Pricing reports checkout unavailable. Signed-in preview behavior is not verified; prior live account checks used localhost. Remaining release decision: user review and separate production merge approval. A successful preview is not a production release.
