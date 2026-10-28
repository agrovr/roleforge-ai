# RoleForge design upgrade release status

## October 28 production verification

With explicit user approval, [PR #9](https://github.com/agrovr/roleforge-ai/pull/9) was merged and deployed to https://roleforgeai.vercel.app at `c3888742ba5e99e89ad32fc87d93912e674763ce`. The deployed commit was confirmed in the browser. Production CI passed 688 tests, lint, typecheck, build, and the authenticated backend smoke workflow. Browser checks confirmed Projects, the public landing escape, Settings, and Status.

The original rendered layout gate failed on stale shared-header/footer selectors and assertions that expected result panels in an empty Studio. [PR #10](https://github.com/agrovr/roleforge-ai/pull/10) updates these checks, separately verifies first-run and restored Studio states, and adds a production layout workflow for testing proposed assertions before merging. Its current run also checks the public landing demo after sign-in and validates decorative cards against the hero boundary with copy-collision checks. Manual production inspection at 1024px and 1712px confirmed the intended card spacing. The corrected [production layout run](https://github.com/agrovr/roleforge-ai/actions/runs/40780411050) passed at test commit `007477e`: 13 pages across 10 responsive widths and two narrow desktop widths, both public themes, and interaction checks including history restore/reset and preview tabs. Frontend CI also passed at that commit.

PR #10 remains a separate merge decision. No payment, support delivery, or live admin mutation was exercised. The sections below retain the original release-candidate evidence; this section supersedes their publication status.

The staged design upgrade is implemented locally across shared branding/navigation, landing, templates, pricing, login, Projects, Studio, Settings, Help/Support/Status, admin support, and legal/update/error pages. Existing auth, account ownership, billing gates, native support actions, and export contracts remain integrated.

## Verified

- Full CI suite at application commit `10f0ee7`: 688 passed, zero failed; GitHub lint, typecheck, and production build also passed.
- Current production build and focused ESLint pass; diff whitespace check passes.
- Real Google sign-in to localhost, signed-in Projects root, public landing escape, and account Settings.
- One explicitly approved fictional QA run: TXT intake, tailoring, generated materials, PDF/DOCX/TXT downloads, saved project persistence and restore. PDF rendered and visually inspected.
- Approved temporary profile-name save persisted after reload; original name restored and verified after another reload.
- Prior slice evidence covers responsive light/dark surfaces, synthetic failures, keyboard behavior, and mobile performance. See design-completion-audit.md for exact scope.

## Release boundaries

- The user approved release-branch publication and subsequently approved PR #9's production merge/deployment. PR #10 is a follow-up verification change awaiting its own merge decision.
- Proposed release includes app/source, regression scripts, public brand assets, next.config.ts and design docs, including the preserved export/demo fixes. Exclude output/, env files, caches, input ZIPs, and downloaded QA files.
- No payment or support email was sent. Local billing/support/admin secrets are intentionally absent; public production reports checkout configuration ready. Actual production billing and support interactions remain separate verification gates.
- The single labeled fictional QA project remains in the user's account.
- Explicitly authorized hosted setup changes: Supabase localhost callback allowlist and Cloud Run CORS for localhost:3100. Cloud Run revision roleforge-api-00073-pbr changed configuration only; backend source is clean.

## Preview release and next step

Published `codex/roleforge-design-upgrade` as [PR #9](https://github.com/agrovr/roleforge-ai/pull/9) against `main`. The release branch incorporates the newer README, CI, and social-preview commits from main. Vercel deployed application commit `10f0ee7` successfully. Chrome checks confirmed the public landing, Pricing navigation/layout, and signed-out Studio gateway; the gateway was reloaded after the latest deployment. The PR review's malformed run-ID finding is fixed with a regression test that preserves recent projects while skipping invalid targeted lookups.

Preview: https://roleforge-ai-git-codex-roleforge-4f2bf3-ashs-projects-e04a172f.vercel.app

Preview Pricing reported checkout unavailable. Signed-in preview behavior was not verified; the original live account checks used localhost. PR #9 has since reached production as recorded above. A successful preview alone does not establish production verification.
