#!/usr/bin/env node

import { pathToFileURL } from "node:url";

const DEFAULT_TIMEOUT_SECONDS = 15 * 60;
const DEFAULT_INTERVAL_SECONDS = 10;
const DEFAULT_SITE_URL = "https://roleforgeai.vercel.app";
const VERCEL_CONTEXT = "Vercel";
const DEPLOYMENT_META_NAME = "roleforge-deployment-commit";

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

async function fetchCommitStatus(repository, sha, token, fetchImpl = fetch) {
  const response = await fetchImpl(`https://api.github.com/repos/${repository}/commits/${sha}/status`, {
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

function deploymentCommitFromHtml(html) {
  const tags = String(html).match(/<meta\b[^>]*>/gi) ?? [];

  for (const tag of tags) {
    const attributes = new Map();
    for (const match of tag.matchAll(/([a-zA-Z:-]+)\s*=\s*(["'])(.*?)\2/g)) {
      attributes.set(match[1].toLowerCase(), match[3]);
    }

    if (attributes.get("name") === DEPLOYMENT_META_NAME) {
      return attributes.get("content")?.trim() || null;
    }
  }

  return null;
}

async function fetchProductionCommit(siteUrl, expectedSha, fetchImpl = fetch) {
  const requestUrl = new URL(siteUrl);
  requestUrl.searchParams.set("roleforge-deployment-check", expectedSha);
  const response = await fetchImpl(requestUrl, {
    headers: { "User-Agent": "RoleForge deployment marker wait" },
    cache: "no-store",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Production deployment marker request failed with ${response.status}`);
  }

  return deploymentCommitFromHtml(await response.text());
}

async function waitForVercelDeployment({
  repository,
  sha,
  token,
  siteUrl,
  timeoutMs,
  intervalMs,
  fetchImpl = fetch,
  sleepImpl = sleep,
  now = Date.now,
  logger = console,
}) {
  const startedAt = now();
  let lastStatusError = "";

  while (now() - startedAt < timeoutMs) {
    let status = null;

    try {
      const payload = await fetchCommitStatus(repository, sha, token, fetchImpl);
      status = vercelStatus(payload);
      lastStatusError = "";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message !== lastStatusError) {
        logger.warn(`${message}; checking the production deployment marker instead.`);
        lastStatusError = message;
      }
    }

    if (status?.state === "success") {
      logger.log(`Vercel deployment completed for ${sha.slice(0, 7)}.`);
      return "vercel-status";
    }

    if (status && ["failure", "error"].includes(status.state)) {
      throw new Error(`Vercel deployment ${status.state}: ${status.description || status.target_url || "no details"}`);
    }

    try {
      const productionCommit = await fetchProductionCommit(siteUrl, sha, fetchImpl);
      if (productionCommit === sha) {
        logger.log(`Production is serving deployment ${sha.slice(0, 7)}.`);
        return "production-marker";
      }

      if (productionCommit) {
        logger.log(`Production is still serving ${productionCommit.slice(0, 7)}; waiting for ${sha.slice(0, 7)}.`);
      } else if (!status) {
        logger.log(`Vercel status and production marker are not available yet for ${sha.slice(0, 7)}.`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.warn(`${message}; continuing to wait for ${sha.slice(0, 7)}.`);
    }

    if (status && !["success", "failure", "error"].includes(status.state)) {
      logger.log(`Vercel deployment is ${status.state}: ${status.description || "waiting"}`);
    }

    await sleepImpl(intervalMs);
  }

  throw new Error(`Timed out waiting for Vercel deployment status or production marker for ${sha.slice(0, 7)}`);
}

async function main() {
  const repository = requiredEnv("GITHUB_REPOSITORY");
  const sha = requiredEnv("GITHUB_SHA");
  const token = process.env.GITHUB_TOKEN?.trim();
  const siteUrl = process.env.ROLEFORGE_SITE_URL?.trim() || DEFAULT_SITE_URL;
  const timeoutMs = numberEnv("VERCEL_STATUS_TIMEOUT_SECONDS", DEFAULT_TIMEOUT_SECONDS) * 1000;
  const intervalMs = numberEnv("VERCEL_STATUS_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS) * 1000;

  await waitForVercelDeployment({
    repository,
    sha,
    token,
    siteUrl,
    timeoutMs,
    intervalMs,
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  deploymentCommitFromHtml,
  fetchProductionCommit,
  vercelStatus,
  waitForVercelDeployment,
};
