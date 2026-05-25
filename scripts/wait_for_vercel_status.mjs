#!/usr/bin/env node

const DEFAULT_TIMEOUT_SECONDS = 15 * 60;
const DEFAULT_INTERVAL_SECONDS = 10;
const VERCEL_CONTEXT = "Vercel";

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

async function fetchCommitStatus(repository, sha, token) {
  const response = await fetch(`https://api.github.com/repos/${repository}/commits/${sha}/status`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "RoleForge Vercel status wait",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub commit status request failed with ${response.status}`);
  }

  return response.json();
}

function vercelStatus(payload) {
  const statuses = Array.isArray(payload.statuses) ? payload.statuses : [];
  return statuses.find((status) => status.context === VERCEL_CONTEXT) ?? null;
}

async function main() {
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const sha = requiredEnv("GITHUB_SHA");
  const token = process.env.GITHUB_TOKEN?.trim();
  const timeoutMs = numberEnv("VERCEL_STATUS_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS) * 1000;
  const intervalMs = numberEnv("VERCEL_STATUS_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS) * 1000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const payload = await fetchCommitStatus(repository, sha, token);
    const status = vercelStatus(payload);

    if (!status) {
      console.log(`Vercel status is not available yet for ${sha.slice(0, 7)}.`);
    } else if (status.state === "success") {
      console.log(`Vercel deployment completed for ${sha.slice(0, 7)}.`);
      return;
    } else if (["failure", "error"].includes(status.state)) {
      throw new Error(`Vercel deployment ${status.state}: ${status.description || status.target_url || "no details"}`);
    } else {
      console.log(`Vercel deployment is ${status.state}: ${status.description || "waiting"}`);
    }

    await sleep(intervalMs);
  }

  throw new Error(`Timed out waiting for Vercel deployment status for ${sha.slice(0, 7)}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
