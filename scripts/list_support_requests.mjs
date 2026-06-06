#!/usr/bin/env node

import { pathToFileURL } from "node:url";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL = "https://ijdspodwpkuhwszmvqip.supabase.co";
const SUPPORT_STATUSES = new Set(["all", "open", "reviewing", "closed"]);
const SUPPORT_CATEGORIES = new Set(["workflow", "exports", "billing", "privacy", "account", "saved-projects", "other"]);

function parsePositiveInteger(value, name, { min = 1, max = 100 } = {}) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${name} must be an integer from ${min} to ${max}.`);
  }
  return parsed;
}

export function supportRequestReference(value = "") {
  const raw = String(value).trim().toUpperCase();
  const withoutPrefix = raw.startsWith("RF-") ? raw.slice(3) : raw;
  const token = withoutPrefix.replace(/[^A-Z0-9]/g, "").slice(-6);
  return token ? `RF-${token.padStart(6, "0")}` : "RF-REQUEST";
}

export function maskSupportEmail(value = "", { showEmail = false } = {}) {
  const email = String(value || "").trim();
  if (!email) return "missing";
  if (showEmail) return email;
  const [name = "", domain = ""] = email.split("@");
  if (!domain) return "masked";
  const maskedName = name.length <= 2 ? `${name.slice(0, 1)}***` : `${name.slice(0, 1)}***${name.slice(-1)}`;
  const [domainName = "", ...domainRest] = domain.split(".");
  const maskedDomain = `${domainName.slice(0, 1) || "*"}***${domainRest.length ? `.${domainRest.join(".")}` : ""}`;
  return `${maskedName}@${maskedDomain}`;
}

function compactPreview(value = "", limit = 180) {
  const compacted = String(value || "").replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit - 3).trim()}...` : compacted;
}

export function summarizeSupportRequest(row, { showEmail = false } = {}) {
  return {
    reference: supportRequestReference(row?.id),
    createdAt: row?.created_at || "",
    status: row?.status || "open",
    category: row?.category || "other",
    email: maskSupportEmail(row?.email, { showEmail }),
    subject: String(row?.subject || "Support request").trim() || "Support request",
    contextUrl: row?.context_url || null,
    messagePreview: compactPreview(row?.message),
  };
}

export function parseArgs(argv) {
  const options = {
    limit: 20,
    status: "open",
    category: "",
    json: false,
    summary: false,
    showEmail: false,
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
    if (name === "--json") {
      options.json = true;
      continue;
    }
    if (name === "--summary") {
      options.summary = true;
      continue;
    }
    if (name === "--show-email") {
      options.showEmail = true;
      continue;
    }
    if (["--limit", "--status", "--category"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      if (name === "--limit") options.limit = parsePositiveInteger(value, "--limit");
      if (name === "--status") {
        if (!SUPPORT_STATUSES.has(value)) throw new Error("--status must be all, open, reviewing, or closed.");
        options.status = value;
      }
      if (name === "--category") {
        if (!SUPPORT_CATEGORIES.has(value)) throw new Error("--category must be a supported support request category.");
        options.category = value;
      }
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`RoleForge AI support inbox

Usage:
  npm run support:inbox
  npm run support:inbox -- --status all --limit 50
  npm run support:inbox -- --summary --status all
  npm run support:inbox -- --category billing --json

Required environment:
  SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY

Optional environment:
  ROLEFORGE_SUPABASE_URL

Emails are masked by default. Use --show-email only when needed for direct follow-up.
Use --summary to print counts without ticket subjects, messages, or emails.
This command reads support_requests and does not print service-role secrets.`);
}

function createServiceClient({ supabaseUrl, serviceRoleKey }) {
  if (!serviceRoleKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY or ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY is required.");
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function listSupportRequests({
  client,
  limit = 20,
  status = "open",
  category = "",
  showEmail = false,
} = {}) {
  let query = client
    .from("support_requests")
    .select("id, email, category, subject, message, context_url, status, created_at");

  if (status !== "all") query = query.eq("status", status);
  if (category) query = query.eq("category", category);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Could not load support requests: ${error.message}`);
  return (data || []).map((row) => summarizeSupportRequest(row, { showEmail }));
}

function formatSupportRequestLine(request) {
  const context = request.contextUrl ? ` context=${request.contextUrl}` : "";
  return `${request.reference} ${request.createdAt} ${request.status}/${request.category} ${request.email} - ${request.subject}${context}\n  ${request.messagePreview}`;
}

export function summarizeSupportInbox(requests = []) {
  const byStatus = {};
  const byCategory = {};
  let newestCreatedAt = null;

  for (const request of requests) {
    byStatus[request.status] = (byStatus[request.status] || 0) + 1;
    byCategory[request.category] = (byCategory[request.category] || 0) + 1;
    if (request.createdAt && (!newestCreatedAt || request.createdAt > newestCreatedAt)) {
      newestCreatedAt = request.createdAt;
    }
  }

  return {
    count: requests.length,
    newestCreatedAt,
    byStatus,
    byCategory,
  };
}

function formatSupportInboxSummary(summary) {
  const status = Object.entries(summary.byStatus).map(([name, count]) => `${name}=${count}`).join(", ") || "none";
  const category = Object.entries(summary.byCategory).map(([name, count]) => `${name}=${count}`).join(", ") || "none";
  return [
    `Support requests: ${summary.count}`,
    `Newest: ${summary.newestCreatedAt || "none"}`,
    `By status: ${status}`,
    `By category: ${category}`,
  ].join("\n");
}

export async function runSupportInboxCli(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const client = createServiceClient({
    supabaseUrl: env.ROLEFORGE_SUPABASE_URL?.trim() || env.NEXT_PUBLIC_SUPABASE_URL?.trim() || DEFAULT_SUPABASE_URL,
    serviceRoleKey: env.ROLEFORGE_SUPABASE_SERVICE_ROLE_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  });

  const requests = await listSupportRequests({ client, ...options });
  if (options.summary) {
    const summary = summarizeSupportInbox(requests);
    console.log(options.json ? JSON.stringify(summary, null, 2) : formatSupportInboxSummary(summary));
    return 0;
  }

  if (options.json) {
    console.log(JSON.stringify({ count: requests.length, requests }, null, 2));
    return 0;
  }

  if (!requests.length) {
    console.log("No support requests found.");
    return 0;
  }

  for (const request of requests) console.log(formatSupportRequestLine(request));
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runSupportInboxCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
