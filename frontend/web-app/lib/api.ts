const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("polis_token");
}

export function setToken(token: string): void {
  localStorage.setItem("polis_token", token);
}

export function removeToken(): void {
  localStorage.removeItem("polis_token");
  localStorage.removeItem("polis_sim_id");
  localStorage.removeItem("polis_sim_name");
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    let message: string;
    // FastAPI 422 — detail is an array of validation errors
    const detail = body?.detail;
    if (Array.isArray(detail)) {
      message = detail.map((e: { msg?: string }) => e.msg?.replace(/^Value error, /, "") ?? "").filter(Boolean).join("; ");
    } else if (typeof detail === "string") {
      message = detail;
    } else if (body?.error?.message) {
      // Custom error envelope: { error: { code, message } }
      message = body.error.message;
    } else if (body?.message) {
      message = body.message;
    } else {
      message = `${res.status} ${res.statusText}`;
    }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

// Typed helpers
export const apiGet = <T>(path: string) => api<T>(path);
export const apiPost = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined });
export const apiPatch = <T>(path: string, body: unknown) =>
  api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = <T>(path: string) => api<T>(path, { method: "DELETE" });
