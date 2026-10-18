import axios from "axios";
import { API_BASE_PATH, HTTP_TIMEOUT_MS } from "@/lib/constants/api";

export class HttpError extends Error {
  readonly status: number;
  readonly data: unknown;

  constructor(status: number, data?: unknown) {
    super(status ? "API request failed" : "API connection failed");
    this.name = "HttpError";
    this.status = status;
    this.data = data;
  }
}

// One transport for browser and server services. Never put user credentials in
// defaults: concurrent server requests share this instance.
export const http = axios.create({
  baseURL: API_BASE_PATH,
  timeout: HTTP_TIMEOUT_MS,
  withCredentials: true,
  maxRedirects: 0,
  responseType: "json",
  transitional: { silentJSONParsing: false },
  headers: { "Content-Type": "application/json" },
});

http.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    // Axios config/request may contain cookies or passwords. Do not expose them.
    const normalized = axios.isAxiosError(error)
      ? new HttpError(error.response?.status || 0, error.response?.data)
      : new HttpError(0);
    return Promise.reject(normalized);
  }
);
