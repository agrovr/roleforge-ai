#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEFAULT_VERCEL_TEAM_ID = "team_kEe4HW272D5nYJDD92amj55H";
const DEFAULT_FRONTEND_REPO = "agrovr/roleforge-ai";
const DEFAULT_BACKEND_REPO = "agrovr/roleforge-ai-backend";
const DEFAULT_PRODUCTION_URL = "https://roleforgeai.vercel.app";

function compactOutput(value = "", limit = 500) {
  const compacted = String(value || "").replace(/\s+/g, " ").trim();
  return compacted.length > limit ? `${compacted.slice(0, limit - 3).trim()}...` : compacted;
}

export function parseArgs(argv) {
  const options = {
    json: false,
    skipLive: false,
    skipSupportInbox: false,
    teamId: DEFAULT_VERCEL_TEAM_ID,
    frontendRepo: DEFAULT_FRONTEND_REPO,
    backendRepo: DEFAULT_BACKEND_REPO,
    productionUrl: DEFAULT_PRODUCTION_URL,
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
    if (name === "--skip-live") {
      options.skipLive = true;
      continue;
    }
    if (name === "--skip-support-inbox") {
      options.skipSupportInbox = true;
      continue;
    }
    if (["--scope", "--team", "--frontend-repo", "--backend-repo", "--production-url"].includes(name)) {
      const value = inlineValue ?? argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${name} requires a value.`);
      if (name === "--scope" || name === "--team") options.teamId = value;
      if (name === "--frontend-repo") options.frontendRepo = value;
      if (name === "--backend-repo") options.backendRepo = value;
      if (name === "--production-url") options.productionUrl = value;
      if (inlineValue === undefined) index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function printHelp() {
  console.log(`RoleForge AI launch readiness audit

Usage:
  npm run audit:launch
  npm run audit:launch -- --json
  npm run audit:launch -- --skip-live
  npm run audit:launch -- --skip-support-inbox

Runs a concise operator audit over smoke readiness, billing readiness,
support inbox volume, recent GitHub Actions, and the Vercel production
deployment. Output avoids printing secret values and support ticket content.`);
}

function runCommand(command, args, { cwd = process.cwd() } = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  return {
    exitCode: Number.isInteger(result.status) ? result.status : result.error ? 1 : 0,
    stdout: result.stdout || "",
    stderr: result.stderr || result.error?.message || "",
  };
}

function runNpx(args, options) {
  if (process.platform === "win32") {
    return runCommand("cmd.exe", ["/d", "/s", "/c", "npx", "vercel", ...args], options);
  }
  return runCommand("npx", ["vercel", ...args], options);
}

export function classifySmokeReadiness(output = "") {
  if (/Smoke readiness is complete/i.test(output)) return { status: "pass", detail: "Signed-in frontend and backend smoke readiness is complete." };
  return { status: "fail", detail: "Signed-in smoke readiness is incomplete." };
}

export function classifyBillingReadiness(output = "") {
  const supportConfigured = /ROLEFORGE_SUPPORT_WEBHOOK_URL is configured/i.test(output);
  const supportMissing = /ROLEFORGE_SUPPORT_WEBHOOK_URL is not configured/i.test(output);
  const encryptedStripeProof = /prove live mode with a live checkout proof/i.test(output);
  const billingReady = /PASS Premium checkout is ready/i.test(output);

  return {
    status: billingReady ? "pass" : "fail",
    detail: billingReady ? "Premium checkout readiness passes for production settings." : "Premium checkout readiness is not passing.",
    warnings: [
      encryptedStripeProof ? "Stripe secret is encrypted in Vercel; keep live checkout proof evidence current." : "",
      supportMissing ? "Support notifications are not configured; tickets still save to Supabase." : "",
    ].filter(Boolean),
    supportNotifications: supportConfigured ? "configured" : supportMissing ? "missing" : "unknown",
  };
}

export function parseWorkflowRuns(jsonText = "", preferredName = "") {
  const parsed = JSON.parse(jsonText);
  const runs = Array.isArray(parsed?.workflow_runs) ? parsed.workflow_runs : [];
  const run = preferredName ? runs.find((candidate) => candidate.name === preferredName) || runs[0] : runs[0];
  if (!run) return null;
  return {
    name: run.name || "workflow",
    status: run.status || "",
    conclusion: run.conclusion || "",
    headSha: run.head_sha || "",
    url: run.html_url || "",
    createdAt: run.created_at || "",
  };
}

export function classifyWorkflowRun(run, label) {
  if (!run) return { status: "fail", detail: `${label} has no recent workflow run.` };
  if (run.status === "completed" && run.conclusion === "success") {
    return { status: "pass", detail: `${label} passed at ${run.headSha.slice(0, 7) || "unknown commit"}.`, url: run.url };
  }
  return {
    status: "fail",
    detail: `${label} is ${run.status || "unknown"}${run.conclusion ? `/${run.conclusion}` : ""}.`,
    url: run.url,
  };
}

export function classifyVercelInspect(output = "") {
  if (/status\s+.*Ready/i.test(output) && /https:\/\/roleforgeai\.vercel\.app/i.test(output)) {
    return { status: "pass", detail: "Vercel production deployment is Ready and aliased to roleforgeai.vercel.app." };
  }
  if (/status\s+.*Ready/i.test(output)) {
    return { status: "warn", detail: "Vercel deployment is Ready, but the production alias was not confirmed in output." };
  }
  return { status: "fail", detail: "Vercel production deployment is not confirmed Ready." };
}

function checkFromCommand(name, commandResult, classifier, { failureStatus = "fail" } = {}) {
  const output = `${commandResult.stdout}\n${commandResult.stderr}`;
  if (commandResult.exitCode !== 0) {
    return {
      name,
      status: failureStatus,
      detail: compactOutput(output || `${name} command failed.`),
      warnings: [],
    };
  }
  return { name, warnings: [], ...classifier(output) };
}

export function parseSupportInboxSummary(output = "") {
  const countMatch = output.match(/Support requests:\s*(\d+)/i);
  const newestMatch = output.match(/Newest:\s*([^\n\r]+)/i);
  const statusMatch = output.match(/By status:\s*([^\n\r]+)/i);
  const categoryMatch = output.match(/By category:\s*([^\n\r]+)/i);
  const byStatus = {};
  const byCategory = {};

  for (const part of (statusMatch?.[1] || "").split(",")) {
    const match = part.trim().match(/^([a-z-]+)=(\d+)$/i);
    if (match) byStatus[match[1]] = Number.parseInt(match[2], 10);
  }

  for (const part of (categoryMatch?.[1] || "").split(",")) {
    const match = part.trim().match(/^([a-z-]+)=(\d+)$/i);
    if (match) byCategory[match[1]] = Number.parseInt(match[2], 10);
  }

  return {
    count: countMatch ? Number.parseInt(countMatch[1], 10) : null,
    newestCreatedAt: newestMatch?.[1]?.trim() || "",
    byStatus,
    byCategory,
  };
}

export function classifySupportInbox(output = "") {
  const summary = parseSupportInboxSummary(output);
  if (!Number.isInteger(summary.count)) {
    return { status: "warn", detail: "Support inbox summary could not be parsed.", warnings: [] };
  }

  const openCount = summary.byStatus.open || 0;
  if (openCount > 0) {
    const noun = openCount === 1 ? "request" : "requests";
    const verb = openCount === 1 ? "needs" : "need";
    return {
      status: "warn",
      detail: `${openCount} open support ${noun} ${verb} operator review.`,
      warnings: [
        "Run `npm run support:inbox` for masked details, then `npm run support:status` when triaged.",
      ],
      supportInbox: summary,
    };
  }

  return {
    status: "pass",
    detail: summary.count > 0
      ? `Support inbox has ${summary.count} saved request${summary.count === 1 ? "" : "s"} and no open queue.`
      : "Support inbox has no saved requests.",
    supportInbox: summary,
  };
}

export function summarizeLaunchAudit(checks) {
  const failures = checks.filter((check) => check.status === "fail");
  const warnings = checks.flatMap((check) => check.status === "warn" ? [check.detail] : check.warnings || []);
  return {
    ready: failures.length === 0,
    failures: failures.map((check) => check.name),
    warnings,
  };
}

export function formatLaunchAudit({ checks, summary }) {
  const lines = ["RoleForge AI launch readiness audit"];
  for (const check of checks) {
    const prefix = check.status === "pass" ? "PASS" : check.status === "warn" ? "WARN" : "FAIL";
    lines.push(`${prefix} ${check.name}: ${check.detail}`);
    for (const warning of check.warnings || []) lines.push(`WARN ${check.name}: ${warning}`);
  }
  lines.push("");
  lines.push(summary.ready ? "PASS Launch audit has no failing checks." : `FAIL Launch audit has failing checks: ${summary.failures.join(", ")}`);
  return lines.join("\n");
}

export async function runLaunchReadinessAudit(options = {}) {
  const cwd = options.cwd || process.cwd();
  const checks = [];

  checks.push(checkFromCommand(
    "Smoke readiness",
    runCommand(process.execPath, ["scripts/check_smoke_readiness.mjs"], { cwd }),
    classifySmokeReadiness,
  ));

  checks.push(checkFromCommand(
    "Billing readiness",
    runCommand(process.execPath, ["scripts/check_billing_launch_readiness.mjs", "--vercel-production", "--strict"], { cwd }),
    classifyBillingReadiness,
  ));

  if (!options.skipLive) {
    if (!options.skipSupportInbox) {
      const supportInbox = runCommand(process.execPath, ["scripts/list_support_requests.mjs", "--summary", "--status", "all", "--limit", "50"], { cwd });
      checks.push(checkFromCommand("Support inbox", supportInbox, classifySupportInbox, { failureStatus: "warn" }));
    } else {
      checks.push({ name: "Support inbox", status: "warn", detail: "Skipped by --skip-support-inbox.", warnings: [] });
    }

    const frontendRuns = runCommand("gh", ["api", `repos/${options.frontendRepo}/actions/runs?branch=main&per_page=5`], { cwd });
    checks.push(checkFromCommand("Frontend CI", frontendRuns, (output) => classifyWorkflowRun(parseWorkflowRuns(output, "Frontend CI"), "Frontend CI")));

    const backendRuns = runCommand("gh", ["api", `repos/${options.backendRepo}/actions/runs?branch=main&per_page=5`], { cwd });
    checks.push(checkFromCommand("Backend production smoke", backendRuns, (output) => classifyWorkflowRun(parseWorkflowRuns(output, "Production Smoke"), "Backend production smoke")));

    const vercelInspect = runNpx(["inspect", options.productionUrl, "--scope", options.teamId], { cwd });
    checks.push(checkFromCommand("Vercel production", vercelInspect, classifyVercelInspect));
  } else {
    checks.push({ name: "Live CI and deploy checks", status: "warn", detail: "Skipped by --skip-live.", warnings: [] });
  }

  const summary = summarizeLaunchAudit(checks);
  return { checks, summary };
}

export async function runLaunchReadinessAuditCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }

  const audit = await runLaunchReadinessAudit(options);
  console.log(options.json ? JSON.stringify(audit, null, 2) : formatLaunchAudit(audit));
  return audit.summary.ready ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runLaunchReadinessAuditCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
