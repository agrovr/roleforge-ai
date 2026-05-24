import { NextResponse } from "next/server";

import { readDownloadProxyError } from "@/app/lib/downloadProxy";
import { parseWorkflowDownloadFilename } from "@/app/lib/downloadUrls";
import { createRoleForgeRouteClient, withSupabaseCookies } from "@/app/lib/supabase/routeClient";

type DownloadContext = {
  params: Promise<{ filename: string }>;
};

function backendBaseUrl() {
  return process.env.NEXT_PUBLIC_BACKEND_URL?.trim().replace(/\/+$/, "") ?? "";
}

function passthroughHeaders(upstream: Response) {
  const headers = new Headers();
  const contentType = upstream.headers.get("content-type");
  const contentDisposition = upstream.headers.get("content-disposition");
  const cacheControl = upstream.headers.get("cache-control");

  if (contentType) headers.set("Content-Type", contentType);
  if (contentDisposition) headers.set("Content-Disposition", contentDisposition);
  headers.set("Cache-Control", cacheControl || "private, max-age=3600");

  return headers;
}

async function requireDownloadSession() {
  const routeClient = await createRoleForgeRouteClient();

  if (!routeClient) {
    return {
      error: NextResponse.json({ error: "Account access is unavailable right now." }, { status: 503 }),
    };
  }

  const {
    data: { session },
    error,
  } = await routeClient.supabase.auth.getSession();

  if (error || !session?.access_token) {
    return {
      error: withSupabaseCookies(
        NextResponse.json({ error: "Sign in again to download this export." }, { status: 401 }),
        routeClient.cookiesToSet,
      ),
    };
  }

  return { routeClient, token: session.access_token };
}

async function proxyDownload(request: Request, context: DownloadContext) {
  const account = await requireDownloadSession();
  if ("error" in account) return account.error;

  const { filename } = await context.params;
  const parsedFilename = parseWorkflowDownloadFilename(filename);
  const baseUrl = backendBaseUrl();

  if (!baseUrl) {
    return withSupabaseCookies(
      NextResponse.json({ error: "Downloads are unavailable right now." }, { status: 503 }),
      account.routeClient.cookiesToSet,
    );
  }

  if (!parsedFilename.ok) {
    return withSupabaseCookies(
      NextResponse.json({ error: parsedFilename.error }, { status: 400 }),
      account.routeClient.cookiesToSet,
    );
  }

  const upstream = await fetch(`${baseUrl}/download/${encodeURIComponent(parsedFilename.filename)}`, {
    method: request.method,
    headers: {
      Authorization: `Bearer ${account.token}`,
    },
    cache: "no-store",
  });

  if (!upstream.ok) {
    const errorPayload = await readDownloadProxyError(upstream);
    return withSupabaseCookies(
      NextResponse.json(errorPayload, { status: upstream.status }),
      account.routeClient.cookiesToSet,
    );
  }

  const response = request.method === "HEAD"
    ? new NextResponse(null, { status: upstream.status, headers: passthroughHeaders(upstream) })
    : new NextResponse(await upstream.arrayBuffer(), { status: upstream.status, headers: passthroughHeaders(upstream) });

  return withSupabaseCookies(response, account.routeClient.cookiesToSet);
}

export async function GET(request: Request, context: DownloadContext) {
  return proxyDownload(request, context);
}

export async function HEAD(request: Request, context: DownloadContext) {
  return proxyDownload(request, context);
}
