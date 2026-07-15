import { readFileSync } from "node:fs";

export function stylesFor(...routeStylesheets) {
  return ["globals.css", ...routeStylesheets]
    .map((stylesheet) => readFileSync(new URL(`../app/${stylesheet}`, import.meta.url), "utf8"))
    .join("\n");
}

export const allPublicStyles = stylesFor(
  "public-pages.css",
  "help/help.css",
  "status/status.css",
  "support/support.css",
  "updates/updates.css",
  "templates/templates.css",
);

export const allStudioStyles = stylesFor("app/studio.css");
