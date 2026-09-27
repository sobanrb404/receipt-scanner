// Thin fetch wrapper: attaches the JWT, throws readable errors, and
// centralizes the API base URL so it's the only place that changes when
// you point this at a deployed backend instead of localhost.

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

const TOKEN_KEY = "receipt_scanner_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  json?: unknown;
  body?: BodyInit;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, ...rest } = options;
  const token = getToken();

  const finalHeaders: Record<string, string> = {
    ...(json !== undefined ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(headers as Record<string, string>),
  };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: finalHeaders,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    let detail = res.statusText;
    try {
      const errBody = await res.json();
      detail = errBody.detail ?? detail;
    } catch {
      // response wasn't JSON — keep statusText
    }
    if (res.status === 401) {
      clearToken();
    }
    throw new ApiError(res.status, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, json?: unknown) => request<T>(path, { method: "POST", json }),
  patch: <T>(path: string, json?: unknown) => request<T>(path, { method: "PATCH", json }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return request<T>(path, { method: "POST", body: formData });
  },
  /** Downloads a file endpoint (e.g. CSV export) that needs the auth header,
   * so a plain <a href> won't work — fetch it, then trigger a save. */
  async downloadFile(path: string, filename: string): Promise<void> {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError(res.status, res.statusText);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export { API_BASE_URL };
