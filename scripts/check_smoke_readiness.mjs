#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export const REPOS = [
  {
    label: "Frontend",
    repo: "agrovr/roleforge-ai",
    requiredVariables: ["ROLEFORGE_SUPABASE_URL", "ROLEFORGE_SUPABASE_PUBLISHABLE_KEY"],
    requiredSecretGroups: [
      ["ROLEFORGE_SMOKE_EMAIL", "ROLEFORGE_SMOKE_PASSWORD"],
      ["ROLEFORGE_SMOKE_COOKIE"],
    ],
    preferredSecretGroup: ["ROLEFORGE_SMOKE_EMAIL", "ROLEFORGE_SMOKE_PASSWORD"],
    requiredGateVariable: "ROLEFORGE_REQUIRE_SIGNED_IN_SMOKE",
  },
  {
    label: "Backend",
    repo: "agrovr/roleforge-ai-backend",
    requiredVariables: ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"],
    requiredSecretGroups: [
      ["ROLEFORGE_SMOKE_EMAIL", "ROLEFORGE_SMOKE_PASSWORD"],
      ["SMOKE_EMAIL", "SMOKE_PASSWORD"],
      ["SMOKE_AUTH_TOKEN"],
    ],
    preferredSecretGroup: ["ROLEFORGE_SMOKE_EMAIL", "ROLEFORGE_SMOKE_PASSWORD"],
    requiredGateVariable: "SMOKE_REQUIRE_SIGNED_IN_SMOKE",
  },
];

function includesAll(names, required) {
  return required.every((name) => names.has(name));
}

export function evaluateRepoReadiness(config, state) {
  const variables = new Set(state.variables || []);
  const secrets = new Set(state.secrets || []);
  const variableValues = state.variableValues || {};
  const findings = [];

  for (const name of config.requiredVariables) {
    findings.push({
      ok: variables.has(name),
      level: variables.has(name) ? "pass" : "fail",
      message: `${config.label} variable ${name}`,
    });
  }

  const configuredSecretGroup = config.requiredSecretGroups.find((group) => includesAll(secrets, group));
  findings.push({
    ok: Boolean(configuredSecretGroup),
    level: configuredSecretGroup ? "pass" : "fail",
    message: configuredSecretGroup
      ? `${config.label} signed-in smoke credentials present (${configuredSecretGroup.join(" + ")})`
      : `${config.label} signed-in smoke credentials missing (${config.requiredSecretGroups.map((group) => group.join(" + ")).join(" or ")})`,
  });

  if (configuredSecretGroup && !includesAll(new Set(configuredSecretGroup), config.preferredSecretGroup)) {
    findings.push({
      ok: true,
      level: "warn",
      message: `${config.label} uses fallback smoke credentials; prefer ${config.preferredSecretGroup.join(" + ")}`,
    });
  }

  const gateValue = (variableValues[config.requiredGateVariable] || "").toLowerCase();
  findings.push({
    ok: gateValue === "true",
    level: gateValue === "true" ? "pass" : "fail",
    message:
      gateValue === "true"
        ? `${config.label} variable ${config.requiredGateVariable}=true`
        : `${config.label} variable ${config.requiredGateVariable} must be true after credentials are configured`,
  });

  return findings;
}

function ghJson(args) {
  const output = execFileSync("gh", args, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  return JSON.parse(output);
}

function loadRepoState(repo) {
  const secrets = ghJson(["api", `repos/${repo}/actions/secrets?per_page=100`]).secrets?.map((secret) => secret.name) || [];
  const variablesPayload = ghJson(["api", `repos/${repo}/actions/variables?per_page=100`]);
  const variables = variablesPayload.variables || [];
  return {
    secrets,
    variables: variables.map((variable) => variable.name),
    variableValues: Object.fromEntries(variables.map((variable) => [variable.name, variable.value])),
  };
}

function printFinding(finding) {
  const prefix = finding.level === "pass" ? "PASS" : finding.level === "warn" ? "WARN" : "FAIL";
  console.log(`${prefix} ${finding.message}`);
}

async function main() {
  let hasFailure = false;

  for (const config of REPOS) {
    console.log(`\n${config.label}: ${config.repo}`);
    const state = loadRepoState(config.repo);
    for (const finding of evaluateRepoReadiness(config, state)) {
      printFinding(finding);
      if (!finding.ok) hasFailure = true;
    }
  }

  if (hasFailure) {
    console.error("\nSmoke readiness is incomplete. Add the missing GitHub variables/secrets, then rerun this check.");
    process.exitCode = 1;
    return;
  }

  console.log("\nSmoke readiness is complete. Signed-in production smoke can be required in CI.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
