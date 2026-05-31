#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const DEFAULT_VERCEL_TEAM_ID = "team_kEe4HW272D5nYJDD92amj55H";

const BILLING_ENV_VALIDATORS = {
  STRIPE_SECRET_KEY: {
    label: "live Stripe secret key",
    test: (value) => value.startsWith("sk_live_"),
  },
  STRIPE_PREMIUM_MONTHLY_PRICE_ID: {
    label: "Stripe monthly price ID",
    test: (value) => value.startsWith("price_"),
  },
  STRIPE_PREMIUM_YEARLY_PRICE_ID: {
    label: "Stripe yearly price ID",
    test: (value) => value.startsWith("price_"),
  },
  STRIPE_WEBHOOK_SECRET: {
    label: "Stripe webhook signing secret",
    test: (value) => value.startsWith("whsec_"),
  },
};

function printHelp() {
  console.log(`RoleForge AI Vercel billing env setter

Usage:
  node scripts/set_vercel_billing_env.mjs STRIPE_SECRET_KEY
  node scripts/set_vercel_billing_env.mjs STRIPE_PREMIUM_MONTHLY_PRICE_ID
  node scripts/set_vercel_billing_env.mjs STRIPE_PREMIUM_YEARLY_PRICE_ID
  node scripts/set_vercel_billing_env.mjs STRIPE_WEBHOOK_SECRET

Pipe exactly one value on stdin. Secrets are validated by prefix and are never printed.
Defaults to Vercel Production for the RoleForge AI team.`);
}

function parseArgs(argv) {
  const options = {
    teamId: DEFAULT_VERCEL_TEAM_ID,
    environment: "production",
    yes: true,
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

export function validateBillingEnvValue(name, value) {
  const validator = BILLING_ENV_VALIDATORS[name];
  if (!validator) {
    throw new Error(`Unsupported billing environment variable: ${name}`);
  }
  if (!value) {
    throw new Error(`No value was provided for ${name}.`);
  }
  if (!validator.test(value)) {
    throw new Error(`${name} does not look like a ${validator.label}.`);
  }
  return true;
}

export function setVercelBillingEnv({ name, value, teamId = DEFAULT_VERCEL_TEAM_ID, environment = "production" }) {
  validateBillingEnvValue(name, value);

  runVercel(["env", "rm", name, environment, "--yes", "--scope", teamId]);
  runVercel(["env", "add", name, environment, "--scope", teamId], {
    input: `${value}\n`,
    stdio: ["pipe", "pipe", "pipe"],
  });

  return {
    name,
    environment,
    teamId,
  };
}

export function runSetVercelBillingEnvCli(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  if (options.help) {
    printHelp();
    return 0;
  }
  if (!options.name) {
    throw new Error("Choose one billing environment variable to set.");
  }

  const value = readAllStdin();
  const result = setVercelBillingEnv({
    name: options.name,
    value,
    teamId: options.teamId,
    environment: options.environment,
  });

  console.log(`Updated ${result.name} in Vercel ${result.environment}. Secret value was not printed.`);
  return 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = runSetVercelBillingEnvCli();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
