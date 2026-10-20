import { NextResponse, type NextRequest } from "next/server";
import { authCookieHeader } from "@/services/auth-proxy.server";
import { isClinicalProxyPath, proxyClinicalRequest } from "@/services/clinical-proxy.server";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!isClinicalProxyPath(path)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    const allowed = (process.env.APP_ORIGIN || request.nextUrl.origin).split(",");
    if (origin && !allowed.includes(origin)) {
      return NextResponse.json({ message: "Origin is not allowed" }, { status: 403 });
    }
  }
  try {
    const body = request.method === "GET" ? undefined : await request.text();
    const result = await proxyClinicalRequest(
      path,
      request.method,
      authCookieHeader(request.cookies),
      body,
      request.headers.get("idempotency-key") || undefined,
      request.nextUrl.search
    );
    return NextResponse.json(result.data, {
      status: result.status,
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "Clinical service is unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
