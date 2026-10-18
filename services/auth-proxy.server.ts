import "server-only";
import { http } from "@/lib/api/http";
import { isUserProfile } from "@/lib/auth";
import { AUTH_COOKIE_NAMES, AUTH_PATHS, AUTH_POST_PATHS } from "@/lib/constants/auth";
import {
  AUTH_BASE_PATH,
  DEFAULT_UPSTREAM_API_URL,
  AUTH_UPSTREAM_TIMEOUT_MS,
} from "@/lib/constants/api";

const API_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_UPSTREAM_API_URL
).replace(/\/$/, "");
type ProxyPath = (typeof AUTH_POST_PATHS)[number] | typeof AUTH_PATHS.ME;

export function isAuthProxyPath(path: string, method: string): path is ProxyPath {
  return method === "GET"
    ? path === AUTH_PATHS.ME
    : method === "POST" && AUTH_POST_PATHS.some((allowed) => allowed === path);
}

export function authCookieHeader(jar: {
  get(name: string): { value: string } | undefined;
}): string {
  return AUTH_COOKIE_NAMES.flatMap((name) => {
    const value = jar.get(name)?.value;
    return value ? [name + "=" + value] : [];
  }).join("; ");
}

export function requestUpstreamAuth(
  path: Exclude<ProxyPath, typeof AUTH_PATHS.SESSION>,
  method: string,
  cookie: string,
  body?: string
) {
  return http.request<unknown>({
    baseURL: API_URL,
    url: AUTH_BASE_PATH + path,
    method,
    data: body,
    headers: { Cookie: cookie },
    adapter: "http",
    timeout: AUTH_UPSTREAM_TIMEOUT_MS,
    signal: AbortSignal.timeout(AUTH_UPSTREAM_TIMEOUT_MS),
    // Relay API failures, but never follow or relay upstream redirects.
    validateStatus: (status) => status >= 200 && status < 600 && (status < 300 || status >= 400),
  });
}

export async function proxyAuthRequest(
  path: ProxyPath,
  method: string,
  cookie: string,
  hasRefresh: boolean,
  body?: string
) {
  let response;
  let setCookies: string[] = [];
  if (path === AUTH_PATHS.SESSION) {
    response = await requestUpstreamAuth(AUTH_PATHS.ME, "GET", cookie);
    if (response.status === 401 && hasRefresh) {
      const refreshed = await requestUpstreamAuth(AUTH_PATHS.REFRESH, "POST", cookie, "{}");
      setCookies = refreshed.headers["set-cookie"] || [];
      response =
        refreshed.status >= 200 && refreshed.status < 300
          ? await requestUpstreamAuth(
              AUTH_PATHS.ME,
              "GET",
              setCookies.map((entry) => entry.split(";")[0]).join("; ")
            )
          : refreshed;
    }
  } else {
    response = await requestUpstreamAuth(path, method, cookie, body);
    setCookies = response.headers["set-cookie"] || [];
  }
  if (!response.data || typeof response.data !== "object" || Array.isArray(response.data)) {
    throw new Error("Invalid authentication response");
  }
  if (
    (path === AUTH_PATHS.SESSION || path === AUTH_PATHS.ME) &&
    response.status === 200 &&
    !isUserProfile(response.data)
  ) {
    throw new Error("Invalid authentication identity");
  }
  const data = { ...response.data } as Record<string, unknown>;
  delete data.accessToken;
  delete data.refreshToken;
  return {
    status: response.status,
    data,
    setCookies,
    clearCookies: path === AUTH_PATHS.SESSION && response.status === 401,
  };
}
