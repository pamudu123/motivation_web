import { accessToken } from "./auth";
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export async function api<T>(path: string, options: RequestInit = {}, authenticated = false): Promise<T> {
  const token = authenticated ? await accessToken() : null;
  if (authenticated && !token) throw new ApiError(401, "unauthenticated", "Please sign in.");
  async function send(bearer: string | null) {
    return fetch(`/api/v1${path}`, { ...options, cache: "no-store", headers: {
      "Content-Type": "application/json", ...options.headers,
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    }});
  }
  let response = await send(token);
  if (authenticated && response.status === 401) {
    const refreshed = await accessToken(true);
    if (refreshed) response = await send(refreshed);
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body?.error?.code ?? "request_failed", body?.error?.message ?? "The service could not complete this request.");
  }
  return response.json();
}
