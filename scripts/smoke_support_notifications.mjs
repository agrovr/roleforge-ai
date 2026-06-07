#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_REFERENCE = "RF-SMOKE";

function compactPreview(value = "", limit = 240) {
  const compacted = String(value || "").replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit - 3).trim()}...` : compacted;
}

export function normalizeSupportWebhookUrl(value = "") {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export function buildSupportNotificationSmokePayload({
  reference = DEFAULT_REFERENCE,
  createdAt = new Date().toISOString(),
} = {}) {
  return {
    event: "support_request.test",
    reference,
    requestId: "support-notification-smoke",
    createdAt,
    category: "other",
    categoryLabel: "Other",
    subject: "RoleForge support notification smoke",
    message: "This is an operator smoke test for the support notification webhook. It is not a customer support request.",
    contextUrl: "/support#request",
    account: {
      email: null,
    },
  };
}

export function parseArgs(argv) {
  const options = {
    url: "",
    secret: "",
    dryRun: false,
    json: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const equalsIndex = arg.indexOf("=");
    const name = equalsIndex >= 0 ? arg.slice(0, equalsIndex) : arg;
    const inlineValue = equalsIndex >= 0 ? arg.slice(equalsIndex + 1) : undefined;

    if (name === "--help" || name === "-h") {
      options.help = true;
      continue;
    }
    if (name === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (name === "--json") {
      options.json = true;
      continue;
    }
    if (name === "--url" || name === "--secret") {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      if (name === "--url") options.url = value;
      if (name === "--secret") options.secret = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`RoleForge AI support notification smoke

Usage:
  npm run smoke:support-notifications
  npm run smoke:support-notifications -- --dry-run
  npm run smoke:support-notifications -- --url https://hooks.example.com/roleforge

Environment:
  ROLEFORGE_SUPPORT_WEBHOOK_URL
  ROLEFORGE_SUPPORT_WEBHOOK_SECRET

Sends a support_request.test payload to the configured webhook.
The command never creates a Supabase support request and never prints the secret.`);
}

export async function sendSupportNotificationSmoke({
  url,
  secret = "",
  payload = buildSupportNotificationSmokePayload(),
  fetcher = globalThis.fetch,
} = {}) {
  const webhookUrl = normalizeSupportWebhookUrl(url);
  if (!webhookUrl) throw new Error("ROLEFORGE_SUPPORT_WEBHOOK_URL must be an https webhook URL.");
  if (typeof fetcher !== "function") throw new Error("fetch is not available in this runtime.");

  const headers = {
    "content-type": "application/json",
    "user-agent": "RoleForge-Support-Smoke/1.0",
  };
  if (secret) headers["x-roleforge-support-secret"] = secret;

  const response = await fetcher(webhookUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (response.ok) {
    return { ok: true, status: response.status, reference: payload.reference };
  }

  const body = typeof response.text === "function" ? await response.text().catch(() => "") : "";
  return {
    ok: false,
    status: response.status,
    reference: payload.reference,
    bodyPreview: compactPreview(body),
  };
}

export async function runSupportNotificationSmokeCli(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const url = options.url || env.ROLEFORGE_SUPPORT_WEBHOOK_URL || "";
  const secret = options.secret || env.ROLEFORGE_SUPPORT_WEBHOOK_SECRET || "";
  const normalizedUrl = normalizeSupportWebhookUrl(url);
  if (!normalizedUrl) throw new Error("ROLEFORGE_SUPPORT_WEBHOOK_URL must be configured as an https webhook URL.");

  const payload = buildSupportNotificationSmokePayload();
  if (options.dryRun) {
    const result = {
      ok: true,
      dryRun: true,
      webhookUrl: normalizedUrl,
      secretConfigured: Boolean(secret),
      event: payload.event,
      reference: payload.reference,
    };
    console.log(options.json ? JSON.stringify(result, null, 2) : `Dry run: ${payload.event} ${payload.reference} would be sent. Secret configured=${Boolean(secret)}.`);
    return 0;
  }

  const result = await sendSupportNotificationSmoke({ url: normalizedUrl, secret, payload });
  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`PASS support notification webhook accepted test payload ${result.reference} status=${result.status}`);
  } else {
    console.log(`FAIL support notification webhook returned status=${result.status} ${result.bodyPreview || ""}`.trim());
  }
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runSupportNotificationSmokeCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
