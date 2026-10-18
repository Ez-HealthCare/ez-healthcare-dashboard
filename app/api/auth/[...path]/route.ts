import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_COOKIE_NAMES, REFRESH_COOKIE } from "@/lib/constants/auth";
import { authCookieHeader, isAuthProxyPath, proxyAuthRequest } from "@/services/auth-proxy.server";

async function handle(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const path = (await context.params).path.join("/");
  if (!isAuthProxyPath(path, request.method)) {
    return NextResponse.json({ message: "Not found" }, { status: 404 });
  }
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    const expectedOrigins = (process.env.APP_ORIGIN || request.nextUrl.origin).split(",");
    if (origin && !expectedOrigins.includes(origin)) {
      return NextResponse.json({ message: "Origin is not allowed" }, { status: 403 });
    }
  }
  try {
    const { status, data, setCookies, clearCookies } = await proxyAuthRequest(
      path,
      request.method,
      authCookieHeader(request.cookies),
      request.cookies.has(REFRESH_COOKIE),
      request.method === "POST" ? await request.text() : undefined
    );
    const result = NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
    for (const entry of setCookies) result.headers.append("Set-Cookie", entry);
    if (clearCookies) {
      for (const name of AUTH_COOKIE_NAMES) result.cookies.set(name, "", { path: "/", maxAge: 0 });
    }
    return result;
  } catch {
    return NextResponse.json(
      { message: "Authentication service is unavailable" },
      {
        status: 503,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}

export const GET = handle;
export const POST = handle;
