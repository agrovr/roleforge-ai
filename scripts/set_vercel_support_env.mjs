#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_VERCEL_TEAM_ID = "team_kEe4HW272D5nYJDD92amj55H";

const SUPPORT_ENV_VALIDATORS = {
  ROLEFORGE_SUPPORT_WEBHOOK_URL: {
    label: "HTTPS support notification webhook URL",
    test: (value) => {
      try {
        return new URL(value).protocol === "https:";
      } catch {
        return false;
      }
    },
  },
  ROLEFORGE_SUPPORT_WEBHOOK_SECRET: {
    label: "support webhook verification secret",
    test: (value) => value.length >= 16,
  },
  ROLEFORGE_SUPPORT_EMAIL_TO: {
    label: "support notification recipient email",
    test: (value) => value
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .every((entry) => looksLikeEmail(entry)),
  },
  ROLEFORGE_SUPPORT_EMAIL_FROM: {
    label: "verified Resend sender email",
    test: (value) => looksLikeEmail(value),
  },
  RESEND_API_KEY: {
    label: "Resend API key",
    test: (value) => value.startsWith("re_") && value.length >= 16,
  },
  ROLEFORGE_ADMIN_EMAILS: {
    label: "support admin email allow-list",
    test: (value) => value
      .split(/[;,]/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .every((entry) => looksLikeEmail(entry)),
  },
};

function looksLikeEmail(value) {
  const candidate = String(value || "").trim();
  const match = candidate.match(/<([^<>@\s]+@[^<>@\s]+\.[^<>@\s]+)>$/);
  const email = (match?.[1] ?? candidate).trim();
  return /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email);
}

function printHelp() {
  console.log(`RoleForge AI Vercel support env setter

Usage:
  node scripts/set_vercel_support_env.mjs ROLEFORGE_SUPPORT_WEBHOOK_URL
  node scripts/set_vercel_support_env.mjs ROLEFORGE_SUPPORT_WEBHOOK_SECRET
  node scripts/set_vercel_support_env.mjs ROLEFORGE_SUPPORT_EMAIL_TO
  node scripts/set_vercel_support_env.mjs ROLEFORGE_SUPPORT_EMAIL_FROM
  node scripts/set_vercel_support_env.mjs RESEND_API_KEY
  node scripts/set_vercel_support_env.mjs ROLEFORGE_ADMIN_EMAILS

Pipe exactly one value on stdin. Values are validated and are never printed.
Defaults to Vercel Production for the RoleForge AI team.`);
}

function parseArgs(argv) {
  const options = {
    teamId: DEFAULT_VERCEL_TEAM_ID,
    environment: "production",
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    if (arg === "--scope" || arg === "--team") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${arg} requires a Vercel team id or slug`);
      options.teamId = value;
      index += 1;
      continue;
    }
    if (arg === "--environment") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--environment requires a Vercel environment");
      options.environment = value;
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  if (positional.length > 1) throw new Error("Expected exactly one environment variable name.");
  options.name = positional[0];
  return options;
}

function readAllStdin() {
  return readFileSync(0, "utf8").trim();
}

function runVercel(args, options = {}) {
  const command = process.platform === "win32" ? "cmd.exe" : "npx";
  const commandArgs = process.platform === "win32" ? ["/d", "/s", "/c", "npx", "vercel", ...args] : ["vercel", ...args];
  return execFileSync(command, commandArgs, {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
    input: options.input,
  });
}

export function validateSupportEnvValue(name, value) {
  const validator = SUPPORT_ENV_VALIDATORS[name];
  if (!validator) {
    throw new Error(`Unsupported support environment variable: ${name}`);
  }
  if (!value) {
    throw new Error(`No value was provided for ${name}.`);
  }
  if (!validator.test(value)) {
    throw new Error(`${name} does not look like a ${validator.label}.`);
  }
  return true;
}

export function setVercelSupportEnv({ name, value, teamId = DEFAULT_VERCEL_TEAM_ID, environment = "production" }) {
  validateSupportEnvValue(name, value);

  runVercel(["env", "add", name, environment, "--force", "--yes", "--scope", teamId], {
    input: `${value}\n`,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return {
    name,
    environment,
    teamId,
  };
}

export function runSetVercelSupportEnvCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }
  if (!options.name) {
    throw new Error("Choose one support environment variable to set.");
  }

  const value = readAllStdin();
  const result = setVercelSupportEnv({
    name: options.name,
    value,
    teamId: options.teamId,
    environment: options.environment,
  });

  console.log(`Updated ${result.name} in Vercel ${result.environment}. Value was not printed.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runSetVercelSupportEnvCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
