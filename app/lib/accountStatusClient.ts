const ACCOUNT_STATUS_CACHE_TTL_MS = 30_000;

type AccountStatusCacheEntry = {
  expiresAt: number;
  value: unknown;
};

type AccountStatusLoadOptions = {
  force?: boolean;
  ttlMs?: number;
};

let cachedStatus: AccountStatusCacheEntry | null = null;
let pendingStatusRequest: Promise<unknown> | null = null;
let requestGeneration = 0;

export function readCachedAccountStatus<T>() {
  if (!cachedStatus || cachedStatus.expiresAt <= Date.now()) {
    cachedStatus = null;
    return undefined;
  }

  return cachedStatus.value as T;
}

export function clearAccountStatusCache() {
  requestGeneration += 1;
  cachedStatus = null;
  pendingStatusRequest = null;
}

export async function loadAccountStatus<T>(options: AccountStatusLoadOptions = {}) {
  const force = options.force ?? false;
  const ttlMs = Math.max(0, options.ttlMs ?? ACCOUNT_STATUS_CACHE_TTL_MS);
  const cached = force ? undefined : readCachedAccountStatus<T>();

  if (cached !== undefined) return cached;
  if (!force && pendingStatusRequest) return pendingStatusRequest as Promise<T>;

  if (force) requestGeneration += 1;
  const generation = requestGeneration;
  const request = fetch("/api/auth/status", {
    cache: "no-store",
    credentials: "same-origin",
  })
    .then(async (response) => {
      if (!response.ok) throw new Error("Account status is temporarily unavailable.");
      return response.json() as Promise<T>;
    })
    .then((payload) => {
      if (generation === requestGeneration) {
        cachedStatus = {
          expiresAt: Date.now() + ttlMs,
          value: payload,
        };
      }
      return payload;
    })
    .finally(() => {
      if (pendingStatusRequest === request) pendingStatusRequest = null;
    });

  pendingStatusRequest = request;
  return request;
}
