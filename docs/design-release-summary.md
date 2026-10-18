# RoleForge design upgrade release candidate

The staged design upgrade is implemented locally across shared branding/navigation, landing, templates, pricing, login, Projects, Studio, Settings, Help/Support/Status, admin support, and legal/update/error pages. Existing auth, account ownership, billing gates, native support actions, and export contracts remain integrated.

## Verified

- Current full test suite: 687 passed, zero failed.
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

## Next release step

Publish `codex/roleforge-design-upgrade` as a PR against `main` and verify its Git-connected preview. The release branch incorporates the newer README, CI, and social-preview commits from main. Do not equate a successful preview with a production release; production requires separate approval.
