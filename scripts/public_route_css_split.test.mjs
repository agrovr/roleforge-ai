import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalStyles = readFileSync("app/globals.css", "utf8");
const rootLayout = readFileSync("app/layout.tsx", "utf8");
const landingPage = readFileSync("app/page.tsx", "utf8");
const routeStyles = {
  landing: readFileSync("app/landing.css", "utf8"),
  help: readFileSync("app/help/help.css", "utf8"),
  status: readFileSync("app/status/status.css", "utf8"),
  support: readFileSync("app/support/support.css", "utf8"),
  updates: readFileSync("app/updates/updates.css", "utf8"),
  templates: readFileSync("app/templates/templates.css", "utf8"),
  settings: readFileSync("app/settings/settings.css", "utf8"),
  studio: readFileSync("app/app/studio.css", "utf8"),
  login: readFileSync("app/login/login.css", "utf8"),
  publicPages: readFileSync("app/public-pages.css", "utf8"),
};

function sourceByteLength(styles) {
  return Buffer.byteLength(styles.replaceAll("\r\n", "\n"));
}

test("route styles load from their owning route instead of the root bundle", () => {
  const routeImports = [
    ["app/help/layout.tsx", /import "\.\/help\.css"/],
    ["app/status/layout.tsx", /import "\.\/status\.css"/],
    ["app/support/layout.tsx", /import "\.\/support\.css"/],
    ["app/updates/layout.tsx", /import "\.\/updates\.css"/],
    ["app/templates/layout.tsx", /import "\.\/templates\.css"/],
    ["app/settings/layout.tsx", /import "\.\/settings\.css"/],
    ["app/app/layout.tsx", /import "\.\/studio\.css"/],
    ["app/login/layout.tsx", /import "\.\/login\.css"/],
  ];

  for (const [file, importPattern] of routeImports) {
    assert.match(readFileSync(file, "utf8"), importPattern);
  }

  assert.match(landingPage, /import "\.\/landing\.css"/);
  assert.match(landingPage, /className="page-shell landing-page"/);
  assert.match(readFileSync("app/components/LegalPage.tsx", "utf8"), /import "\.\.\/public-pages\.css"/);
  assert.doesNotMatch(readFileSync("app/not-found.tsx", "utf8"), /public-pages\.css/);
  assert.doesNotMatch(rootLayout, /(landing|help|status|support|updates|templates|public-pages)\.css/);
});

test("the root not-found fallback does not preload public-page route styles", () => {
  const notFound = readFileSync("app/not-found.tsx", "utf8");

  assert.match(notFound, /className="not-found-shell"/);
  assert.match(notFound, /<PublicInfoHeader active="not-found"/);
  assert.match(globalStyles, /\.not-found-shell\s*\{[\s\S]*?min-height:\s*100dvh;/);
  assert.doesNotMatch(notFound, /legal-shell|legal-topbar/);
});

test("the universal stylesheet no longer carries complete page-owned rule sets", () => {
  assert.ok(sourceByteLength(globalStyles) < 165_000, "universal stylesheet should stay below the route-split budget");
  assert.ok(sourceByteLength(routeStyles.landing) < 160_000, "landing stylesheet should stay focused");

  const ownershipChecks = [
    [routeStyles.landing, globalStyles, /\/\* Landing pricing refinement:/],
    [routeStyles.landing, globalStyles, /\/\* Landing workflow refinement:/],
    [routeStyles.landing, globalStyles, /\/\* Landing FAQ refinement:/],
    [routeStyles.landing, globalStyles, /\.pricing-grid\s*\{/],
    [routeStyles.landing, globalStyles, /\.faq-grid\s*\{/],
    [routeStyles.landing, globalStyles, /\.dash-demo-reset\s*\{/],
    [routeStyles.help, globalStyles, /\.help-action-grid\s*\{/],
    [routeStyles.status, globalStyles, /\.status-shell\s*\{/],
    [routeStyles.support, globalStyles, /\.support-shell\s*\{/],
    [routeStyles.updates, globalStyles, /\.updates-ledger\s*\{/],
    [routeStyles.templates, globalStyles, /\.templates-decision-guide\s*\{/],
    [routeStyles.settings, globalStyles, /\.settings-grid\s*\{/],
    [routeStyles.studio, globalStyles, /\.rf-studio-layout\s*\{/],
    [routeStyles.login, globalStyles, /\.login-shell\s*\{[^}]*isolation:\s*isolate/],
    [routeStyles.publicPages, globalStyles, /\.legal-card\s*\{/],
  ];

  for (const [ownerStyles, universalStyles, selector] of ownershipChecks) {
    assert.match(ownerStyles, selector);
    assert.doesNotMatch(universalStyles, selector);
  }
});

test("landing rules stay isolated after client-side navigation", () => {
  assert.match(routeStyles.landing, /:where\(\.landing-page\)\.page-shell\s*\{/);
  assert.match(routeStyles.landing, /:where\(\.landing-page\) \.nav\s*\{/);
  assert.match(routeStyles.landing, /:where\(\.landing-page\) \.templates\s*\{/);
  assert.match(routeStyles.landing, /html\[data-theme="dark"\] :where\(\.landing-page\) \.footer\s*\{/);
  assert.doesNotMatch(routeStyles.landing, /^\.nav\s*\{/m);
  assert.doesNotMatch(routeStyles.landing, /^\.templates\s*\{/m);
  assert.doesNotMatch(routeStyles.landing, /^\.footer\s*\{/m);
});

test("the protected studio auth gate loads the shared login route styles before studio overrides", () => {
  const studioLayout = readFileSync("app/app/layout.tsx", "utf8");

  assert.match(studioLayout, /import "\.\.\/login\/login\.css";\s*import "\.\/studio\.css";/);
  assert.match(routeStyles.login, /\.login-panel\s*\{/);
  assert.doesNotMatch(globalStyles, /\.login-panel\s*\{/);
});

test("support experience polish ships only with routes that render it", () => {
  assert.match(routeStyles.support, /\/\* Support experience polish:/);
  assert.match(routeStyles.support, /@keyframes support-panel-rise/);
  assert.doesNotMatch(globalStyles, /\/\* Support experience polish:/);
  assert.doesNotMatch(globalStyles, /@keyframes support-panel-rise/);

  assert.match(routeStyles.settings, /Settings keeps the shared ticket-status treatment/);
  assert.match(routeStyles.settings, /\.support-status-badge\.closed\s*\{/);
  assert.match(routeStyles.settings, /html\[data-theme="dark"\] \.support-status-badge\s*\{/);
});

test("the production smoke reads route styles from every page it validates", () => {
  const smokeSource = readFileSync("scripts/smoke_frontend.mjs", "utf8");

  assert.match(smokeSource, /request\(baseUrl,\s*"\/help"/);
  assert.match(smokeSource, /\[home\.text,\s*login\.text,\s*templates\.text,\s*help\.text\]/);
  assert.match(smokeSource, /stylesheetPageTexts\.push\(settingsStylesheetPage\.text\)/);
  assert.match(smokeSource, /stylesheetPageTexts\.push\(studioStylesheetPage\.text\)/);
  assert.match(smokeSource, /checkPublicShell\(baseUrl,\s*cookie\)/);
  assert.match(smokeSource, /new Set\(/);
  assert.match(smokeSource, /public pages did not include Next\.js stylesheets/);
  assert.match(smokeSource, /readFileSync\(new URL\("\.\.\/app\/landing\.css"/);
  assert.match(smokeSource, /stylesheetText = withoutLandingScope\(stylesheetText\)/);
});

test("studio route owns workbench and protected-surface rules", () => {
  assert.ok(Buffer.byteLength(routeStyles.studio) < 200_000, "studio route stylesheet should stay focused");
  assert.match(routeStyles.studio, /\.rf-intake-card,\s*\.rf-file-drop,\s*\.rf-target-editor/);
  assert.match(routeStyles.studio, /\/\* Studio workbench polish:/);
  assert.match(routeStyles.studio, /\/\* Studio preview finish:/);
  assert.match(routeStyles.studio, /\/\* Protected Studio finish stays route-scoped/);
  assert.match(routeStyles.studio, /@keyframes rf-status-flow/);
  assert.doesNotMatch(globalStyles, /\.rf-intake-card,\s*\.rf-file-drop,\s*\.rf-target-editor/);
  assert.doesNotMatch(globalStyles, /\/\* Studio workbench polish:/);
  assert.doesNotMatch(globalStyles, /@keyframes rf-status-flow/);
});

test("route-owned support grids keep their narrow breakpoint after the split", () => {
  assert.match(
    routeStyles.support,
    /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.support-admin-entry,\s*\.support-routing-strip,\s*\.support-routing-steps\s*\{\s*grid-template-columns:\s*1fr/,
  );
});

test("settings route keeps shared finish rules in their original cascade order", () => {
  assert.ok(Buffer.byteLength(routeStyles.settings) < 200_000, "settings route stylesheet should stay focused");
  assert.match(globalStyles, /\.settings-page-topbar\s*\{/);
  assert.match(globalStyles, /\.settings-account-menu\s*\{/);
  assert.match(routeStyles.settings, /\.settings-page-topbar\s*\{/);
  assert.match(routeStyles.settings, /#projects\.settings-section\s*\{/);
  assert.doesNotMatch(globalStyles, /#projects\.settings-section\s*\{/);
  assert.match(
    routeStyles.settings,
    /\.settings-project-item,\s*\.settings-project-empty[\s\S]*?\.settings-project-item,\s*\.settings-document-item,\s*\.studio-account-recent-link/,
  );
});

test("protected Studio and Settings finish stays out of the universal stylesheet", () => {
  assert.match(
    routeStyles.studio,
    /\.rf-studio-hero,\s*\.rf-preflight-panel,\s*\.export-readiness-panel,\s*\.rf-recovery-card/,
  );
  assert.match(
    routeStyles.settings,
    /\.settings-account-overview,\s*\.settings-activity-panel,\s*\.settings-account-health,\s*\.settings-plan-access/,
  );
  assert.doesNotMatch(
    globalStyles,
    /\.rf-studio-hero,\s*\.rf-preflight-panel,\s*\.export-readiness-panel,\s*\.rf-recovery-card,\s*\.settings-account-overview/,
  );
  assert.doesNotMatch(
    globalStyles,
    /\.rf-preflight-item,\s*\.export-readiness-item,\s*\.settings-activity-item,\s*\.settings-account-health-card/,
  );
});
