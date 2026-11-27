# Reference fidelity correction

The prior release passed behavior/layout checks but retained obsolete presentation. This correction follows the supplied compositions, not the old application's density.

## Reference inventory

Source ZIP: `Website GitHub upgrade1.zip`, extracted without executing its runtime into `../design-inputs/website-upgrade-2026-10-29/`. `inventory.json` records SHA-256 comparisons: all 25 top-level `.dc.html` files match both their bundled copies and the prior input set. The newer archive therefore does not explain the implementation gaps.

User-selected live visual authorities: `RoleForge Studio.dc.html` and `RoleForge Settings.dc.html` in Claude project `cc6d8ace-af8d-4594-a0c1-f4af20981a9d`. Do not select a different version merely because its name contains v2. Instructions in the archive are context, not execution or deployment authorization.

| Surface | Reference | Required comparison |
| --- | --- | --- |
| Studio empty | RoleForge Studio First Run.dc.html | Progress above workspace; focused upload; guide and real template examples; no result placeholders |
| Studio completed | RoleForge Studio.dc.html, user-selected tab | Header, rail, result hierarchy, preview/suggestions, target/ATS/assets/history; actual data and controls |
| Studio signed out | RoleForge Studio Gateway.dc.html | Existing real authentication gate and callback |
| Settings | RoleForge Settings.dc.html, user-selected tab | Workspace health first; compact template choices and project rows; remove repeated overview/activity/billing blocks |
| Help, Support, Status | RoleForge Help Support Status v2.dc.html, compare base variant | Restore reference hierarchy; form-first support with context/history alongside |
| Projects | RoleForge Home.dc.html | Compare composition, filters and actual project rows |
| Templates, Login | Corresponding base and v2 HTML | Confirm intended rendered variant; compare full page, not only tokens |
| Landing, Pricing | Landing v2 and Pricing HTML | Compare section hierarchy, typography, spacing and controls |
| Admin, legal, updates, 404 | Corresponding supplied pages | Compare separately; retain actual permissions and factual content |
| Shared components | SiteHeader, SiteFooter, ResumeSheet | Use supplied variants; retain real navigation/account state and resume renderer |

## Order and acceptance

1. Studio empty, intake, completed and restored states.
2. Settings and Support structural corrections.
3. Remaining route-by-route fidelity inventory and corrections.
4. Desktop/mobile visual comparison with the same state and theme, behavior checks, and user preview.

Retain upload capabilities/limits, auth, ownership, saved data, tailoring, exports, billing and support contracts. Never copy fictional metrics, plan state or sample results into a real account. Replace unnecessary old markup rather than hiding it beneath cosmetic overrides. Document each deliberate departure from the reference. Local implementation is authorized; new publication is a separate decision after reviewable previews exist.

## Local review

Studio first-run and restored-result views, Settings, Support, Help, Status, Projects, and Templates have had desktop and narrow-screen checks. The restored Studio check used a saved fictional run. Support review covered the form and history without sending a request.

The login page keeps authentication above secondary content on phones. Its studio preview uses wrapping columns. Clicking Continue with Google in the local browser reached Google's sign-in page.

Privacy and Terms use a single column of numbered policy sections. Updates uses one row per release, with the summary and destination beside its details on wide screens. At a 1270px browser width, the six Updates sections measured 1120px each, the four releases occupied separate rows, and the page had no horizontal overflow.

Privacy, Terms, and Updates had no horizontal overflow at 380px. The missing-page route returned HTTP 404 and rendered a two-column hero and three recovery cards at 1270px. At 380px the hero and links stacked without horizontal overflow. Home, Templates, Status, and Support returned HTTP 200. The signed-out Studio route returned a redirect.

Landing now includes the review example between the role strip and workflow. Its illustrative rewrite uses only information present in the original sentence. The two cards rendered side by side at 1270px and stacked at 380px. All ten landing sections appeared in reference order. Pricing's plans, comparison, and FAQ measured 980px at desktop width. Its two plan columns stacked on phones. Neither page showed horizontal overflow.

After the landing and pricing edits, the local production build completed, including TypeScript and all 29 static generation steps. All 688 automated tests passed. ESLint passed on `app` and `scripts`. The anonymous operator route returned a streamed redirect to sign in with a return destination of `/admin/support` and omitted the inbox counts. A current signed-in visual check of the operator inbox and user review of the preview are pending.

The subsequent operator inbox correction moves search and the filtered count into a responsive row. Bulk actions appear when a visible request is selected, with refresh available independently of selection. The revised build and 17 focused admin tests passed. An empty-queue render confirmed that refresh and selection are present while bulk actions are absent.

After review of the customer Support screenshot, the five topic cards were removed. The topic selector now shows guidance for each of its seven options. Signed-in Chrome preserved the draft subject and message when switching topics. At measured viewport widths of 422px and 1589px, the workspace had one and two columns respectively, with no horizontal overflow. The production build and all 688 tests passed with this change. The local preview has no configured staff allowlist, so the signed-in operator inbox still needs visual verification with a staff account.

The current SupportQueue component was also rendered with two fictional requests on an isolated loopback server. Filtering to closed showed one record, selecting it exposed bulk actions, and clearing selection and searching for an absent phrase reached the empty state. The queue had no horizontal overflow at measured widths of 380px and 1430px. This exercised the queue UI only. Live staff access and backend writes were outside this check.

The approved temporary operator preview opened the protected route in signed-in Chrome. The heading, readiness panel, filters, and queue error state rendered with zero horizontal overflow at measured widths of 422px and 1589px. The local operator database client was unavailable and the customer reply sender was unconfigured. Populated queue interaction was verified separately with fictional records. No live replies or status updates were performed. The regular preview continued to show the restricted route as missing, and the temporary listener was confirmed stopped. Local design implementation is ready for user review.
