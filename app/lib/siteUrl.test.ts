import assert from "node:assert/strict";
import test from "node:test";

import { getConfiguredSiteOrigin, getRequestOrigin } from "./siteUrl";

const envKeys = ["NEXT_PUBLIC_SITE_URL", "ROLEFORGE_SITE_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;

function withSiteEnv(values: Partial<Record<(typeof envKeys)[number], string>>, run: () => void) {
  const previous = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

  for (const key of envKeys) {
    delete process.env[key];
  }

  Object.assign(process.env, values);

  try {
    run();
  } finally {
    for (const key of envKeys) {
      if (previous[key]) {
        process.env[key] = previous[key];
      } else {
        delete process.env[key];
      }
    }
  }
}

test("uses RoleForge smoke site URL for generated crawler metadata", () => {
  withSiteEnv({
    NEXT_PUBLIC_SITE_URL: "https://roleforgeai.vercel.app",
    ROLEFORGE_SITE_URL: "http://127.0.0.1:3047",
  }, () => {
    assert.equal(getConfiguredSiteOrigin(), "http://127.0.0.1:3047");
  });
});

test("prefers the production site URL over Vercel preview origins", () => {
  withSiteEnv({
    NEXT_PUBLIC_SITE_URL: "https://roleforgeai.vercel.app",
    VERCEL_URL: "roleforge-ai-preview.vercel.app",
  }, () => {
    assert.equal(getConfiguredSiteOrigin(), "https://roleforgeai.vercel.app");
    assert.equal(getRequestOrigin("https://roleforge-ai-preview.vercel.app/settings"), "https://roleforgeai.vercel.app");
  });
});

test("keeps localhost request origins for local route redirects", () => {
  withSiteEnv({ NEXT_PUBLIC_SITE_URL: "https://roleforgeai.vercel.app" }, () => {
    assert.equal(getRequestOrigin("http://127.0.0.1:3047/settings"), "http://127.0.0.1:3047");
  });
});
