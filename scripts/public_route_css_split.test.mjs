import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const globalStyles = readFileSync("app/globals.css", "utf8");
const rootLayout = readFileSync("app/layout.tsx", "utf8");
const routeStyles = {
  help: readFileSync("app/help/help.css", "utf8"),
  status: readFileSync("app/status/status.css", "utf8"),
  support: readFileSync("app/support/support.css", "utf8"),
  updates: readFileSync("app/updates/updates.css", "utf8"),
  templates: readFileSync("app/templates/templates.css", "utf8"),
  publicPages: readFileSync("app/public-pages.css", "utf8"),
};

test("public route styles load from their owning route instead of the root bundle", () => {
  const routeImports = [
    ["app/help/layout.tsx", /import "\.\/help\.css"/],
    ["app/status/layout.tsx", /import "\.\/status\.css"/],
    ["app/support/layout.tsx", /import "\.\/support\.css"/],
    ["app/updates/layout.tsx", /import "\.\/updates\.css"/],
    ["app/templates/layout.tsx", /import "\.\/templates\.css"/],
  ];

  for (const [file, importPattern] of routeImports) {
    assert.match(readFileSync(file, "utf8"), importPattern);
  }

  assert.match(readFileSync("app/components/LegalPage.tsx", "utf8"), /import "\.\.\/public-pages\.css"/);
  assert.match(readFileSync("app/not-found.tsx", "utf8"), /import "\.\/public-pages\.css"/);
  assert.doesNotMatch(rootLayout, /(help|status|support|updates|templates|public-pages)\.css/);
});

test("the universal stylesheet no longer carries complete page-owned rule sets", () => {
  assert.ok(Buffer.byteLength(globalStyles) < 600_000, "universal stylesheet should stay below the public-route split budget");

  const ownershipChecks = [
    [routeStyles.help, globalStyles, /\.help-action-grid\s*\{/],
    [routeStyles.status, globalStyles, /\.status-shell\s*\{/],
    [routeStyles.support, globalStyles, /\.support-shell\s*\{/],
    [routeStyles.updates, globalStyles, /\.updates-ledger\s*\{/],
    [routeStyles.templates, globalStyles, /\.templates-decision-guide\s*\{/],
    [routeStyles.publicPages, globalStyles, /\.legal-card\s*\{/],
  ];

  for (const [ownerStyles, universalStyles, selector] of ownershipChecks) {
    assert.match(ownerStyles, selector);
    assert.doesNotMatch(universalStyles, selector);
  }
});

test("the production smoke reads route styles from every page it validates", () => {
  const smokeSource = readFileSync("scripts/smoke_frontend.mjs", "utf8");

  assert.match(smokeSource, /\[home\.text,\s*templates\.text\]/);
  assert.match(smokeSource, /new Set\(/);
  assert.match(smokeSource, /public pages did not include Next\.js stylesheets/);
});

test("route-owned support grids keep their narrow breakpoint after the split", () => {
  assert.match(
    routeStyles.support,
    /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.support-admin-entry,\s*\.support-routing-strip,\s*\.support-routing-steps\s*\{\s*grid-template-columns:\s*1fr/,
  );
});
