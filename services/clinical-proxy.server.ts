import "server-only";
import { DEFAULT_UPSTREAM_API_URL } from "@/lib/constants/api";
import { http } from "@/lib/api/http";

const API_URL = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  DEFAULT_UPSTREAM_API_URL
).replace(/\/$/, "");

const ALLOWED = [
  /^visits\/(hall-ticket|me\/current|reception\/(queue|expired|call-next)|doctor\/rooms)$/,
  /^visits\/queue\/[A-Za-z0-9.-]+$/,
  /^visits\/[0-9a-f-]+(\/.*)?$/i,
  /^appointments\/reception\/today$/,
  /^appointments\/[0-9a-f-]+(\/(cancel|reception\/check-in))?$/i,
  /^departments$/,
  /^users\/me\/profile$/,
  /^reception-requests\/me\/(current|draft|submit|cancel)$/,
  /^reception-requests\/reception\/pending$/,
  /^reception-requests\/reception\/[0-9a-f-]+\/(confirm|reject)$/i,
  /^notifications(\/[0-9a-f-]+\/read|\/read-all)?$/i,
];

export function isClinicalProxyPath(path: string) {
  return ALLOWED.some((pattern) => pattern.test(path));
}

export async function proxyClinicalRequest(
  path: string,
  method: string,
  cookie: string,
  body?: string,
  idempotencyKey?: string,
  query = ""
) {
  const response = await http.request({
    baseURL: API_URL,
    url: path + query,
    method,
    data: body || undefined,
    adapter: "http",
    timeout: 15_000,
    signal: AbortSignal.timeout(15_000),
    validateStatus: () => true,
    headers: {
      Cookie: cookie,
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    },
  });
  return {
    status: response.status,
    data: response.data,
  };
}
