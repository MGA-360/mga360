const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

function getAccessToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("mga360_access_token");
}

function getRefreshToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("mga360_refresh_token");
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Evita disparar N refreshes em paralelo quando várias chamadas levam 401 ao
// mesmo tempo (ex: a página monta e faz 3 fetches simultâneos).
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return null;
        const body = await res.json();
        window.localStorage.setItem("mga360_access_token", body.accessToken);
        return body.accessToken as string;
      })
      .catch(() => null)
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function clearSessionAndRedirect() {
  window.localStorage.removeItem("mga360_access_token");
  window.localStorage.removeItem("mga360_refresh_token");
  window.localStorage.removeItem("mga360_user");
  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

// Admin operando em nome de um cliente: guarda o companyId da URL e o anexa
// em todas as chamadas à API (exceto /auth).
function withAdminCompany(path: string): string {
  if (typeof window === "undefined" || path.startsWith("/auth")) return path;
  try {
    const user = JSON.parse(window.localStorage.getItem("mga360_user") || "null");
    if (user?.role !== "ADMIN") return path;
    const fromUrl = new URLSearchParams(window.location.search).get("companyId");
    if (fromUrl) window.sessionStorage.setItem("mga360_admin_company", fromUrl);
    const companyId = fromUrl || window.sessionStorage.getItem("mga360_admin_company");
    if (!companyId || /[?&]companyId=/.test(path)) return path;
    return path + (path.includes("?") ? "&" : "?") + "companyId=" + encodeURIComponent(companyId);
  } catch {
    return path;
  }
}

async function request<T>(path: string, options: RequestInit = {}, isRetry = false): Promise<T> {
  path = withAdminCompany(path);
  const token = getAccessToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Access token expirado: tenta renovar uma vez com o refresh token antes
  // de desistir e mandar o usuário para o login.
  if (res.status === 401 && !isRetry && path !== "/auth/login" && path !== "/auth/refresh") {
    const newToken = await refreshAccessToken();
    if (newToken) return request<T>(path, options, true);
    clearSessionAndRedirect();
    throw new ApiError(401, "Sessão expirada. Faça login novamente.");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(res.status, body?.error || "Erro inesperado ao comunicar com o servidor.");
  }

  return body as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  put: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PUT", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

export async function downloadFile(path: string, filename: string) {
  const token = getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body?.error || "Não foi possível baixar o arquivo.");
  }

  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
