import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./auth-storage";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public code?: string,
    public status?: number,
  ) {
    super(message);
  }
}

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const body: Envelope<{ accessToken: string; refreshToken: string }> = await res.json();
        if (body.success && body.data) {
          setTokens(body.data.accessToken, body.data.refreshToken);
          return true;
        }
        return false;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401 && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request<T>(path, options, false);
    clearTokens();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("Session expired. Please log in again.", "UNAUTHORIZED", 401);
  }

  const body = (await response.json().catch(() => null)) as Envelope<T> | null;

  if (!response.ok || !body?.success) {
    throw new ApiError(body?.error?.message ?? `Request failed (${response.status})`, body?.error?.code, response.status);
  }

  return body.data as T;
}

const get = <T>(path: string) => request<T>(path, { method: "GET" });
const post = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "POST", body: data != null ? JSON.stringify(data) : undefined });
const patch = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PATCH", body: data != null ? JSON.stringify(data) : undefined });
const put = <T>(path: string, data?: unknown) =>
  request<T>(path, { method: "PUT", body: data != null ? JSON.stringify(data) : undefined });
const del = <T>(path: string) => request<T>(path, { method: "DELETE" });

export const api = {
  auth: {
    register: (data: { email: string; password: string; name: string }) =>
      post<{ user: any; accessToken: string; refreshToken: string }>("/auth/register", data),
    login: (data: { email: string; password: string }) =>
      post<{ user: any; accessToken: string; refreshToken: string }>("/auth/login", data),
    me: () => get<any>("/auth/me"),
    logout: (refreshToken: string) => post("/auth/logout", { refreshToken }),
    sessions: () => get<any[]>("/auth/sessions"),
  },
  users: {
    updatePreferences: (data: any) => patch<any>("/users/me/preferences", data),
  },
  projects: {
    list: () => get<any[]>("/projects"),
    create: (data: any) => post<any>("/projects", data),
    get: (id: string) => get<any>(`/projects/${id}`),
    update: (id: string, data: any) => patch<any>(`/projects/${id}`, data),
    remove: (id: string) => del(`/projects/${id}`),
    members: (id: string) => get<any[]>(`/projects/${id}/members`),
    addMember: (id: string, data: any) => post<any>(`/projects/${id}/members`, data),
    updateMember: (id: string, memberId: string, role: string) =>
      patch<any>(`/projects/${id}/members/${memberId}`, { role }),
    removeMember: (id: string, memberId: string) => del<any>(`/projects/${id}/members/${memberId}`),
  },
  appliances: {
    categories: () => get<any[]>("/appliances/categories"),
    catalog: (params?: { category?: string; q?: string }) => {
      const qs = new URLSearchParams(params as any).toString();
      return get<any[]>(`/appliances/catalog${qs ? `?${qs}` : ""}`);
    },
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/appliances`),
    create: (projectId: string, data: any) => post<any>(`/projects/${projectId}/appliances`, data),
    update: (projectId: string, applianceId: string, data: any) =>
      patch<any>(`/projects/${projectId}/appliances/${applianceId}`, data),
    remove: (projectId: string, applianceId: string) => del(`/projects/${projectId}/appliances/${applianceId}`),
    duplicate: (projectId: string, applianceId: string) =>
      post<any>(`/projects/${projectId}/appliances/${applianceId}/duplicate`),
  },
  calculations: {
    run: (projectId: string, data?: { safetyMargin?: number }) =>
      post<any>(`/projects/${projectId}/calculations`, data ?? {}),
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/calculations`),
    get: (id: string) => get<any>(`/calculations/${id}`),
  },
  loadAnalysis: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/load-analysis`),
  },
  tariffs: {
    list: () => get<any[]>("/tariffs"),
    getProjectTariff: (projectId: string) => get<any>(`/projects/${projectId}/tariff`),
    setProjectTariff: (projectId: string, tariffId: string) =>
      post<any>(`/projects/${projectId}/tariff`, { tariffId }),
  },
  bills: {
    calculate: (projectId: string, monthlyKwh?: number) =>
      post<any>(`/projects/${projectId}/bills/calculate`, monthlyKwh != null ? { monthlyKwh } : {}),
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/bills`),
  },
  sizing: {
    inverter: {
      calculate: (projectId: string, data: any) => post<any>(`/projects/${projectId}/sizing/inverter`, data),
      latest: (projectId: string) => get<any>(`/projects/${projectId}/sizing/inverter`),
    },
    battery: {
      calculate: (projectId: string, data: any) => post<any>(`/projects/${projectId}/sizing/battery`, data),
      latest: (projectId: string) => get<any>(`/projects/${projectId}/sizing/battery`),
    },
    solar: {
      calculate: (projectId: string, data: any) => post<any>(`/projects/${projectId}/sizing/solar`, data),
      latest: (projectId: string) => get<any>(`/projects/${projectId}/sizing/solar`),
    },
    generator: {
      calculate: (projectId: string, data: any) => post<any>(`/projects/${projectId}/sizing/generator`, data),
      latest: (projectId: string) => get<any>(`/projects/${projectId}/sizing/generator`),
    },
  },
  essentialLoad: {
    get: (projectId: string) => get<any>(`/projects/${projectId}/essential-load`),
    recalculate: (projectId: string) => post<any>(`/projects/${projectId}/essential-load`),
    setPriorities: (projectId: string, updates: any[]) =>
      patch<any>(`/projects/${projectId}/essential-load`, { updates }),
  },
  scenarios: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/scenarios`),
    create: (projectId: string, name: string) => post<any>(`/projects/${projectId}/scenarios`, { name }),
    get: (id: string) => get<any>(`/scenarios/${id}`),
    remove: (id: string) => del(`/scenarios/${id}`),
    addAppliance: (id: string, data: any) => post<any>(`/scenarios/${id}/appliances`, data),
    updateAppliance: (id: string, applianceId: string, data: any) =>
      patch<any>(`/scenarios/${id}/appliances/${applianceId}`, data),
    removeAppliance: (id: string, applianceId: string) => del(`/scenarios/${id}/appliances/${applianceId}`),
    calculate: (id: string) => post<any>(`/scenarios/${id}/calculate`),
    compare: (projectId: string, scenarioIds: string[]) =>
      post<any>(`/projects/${projectId}/scenarios/compare`, { scenarioIds }),
  },
  recommendations: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/recommendations`),
    generate: (projectId: string) => post<any[]>(`/projects/${projectId}/recommendations/generate`),
  },
  schedules: {
    get: (projectId: string) => get<any>(`/projects/${projectId}/schedules`),
    upsertItem: (projectId: string, applianceId: string, data: { startTime: string; endTime: string }) =>
      put<any>(`/projects/${projectId}/schedules/items/${applianceId}`, data),
    removeItem: (projectId: string, applianceId: string) =>
      del<any>(`/projects/${projectId}/schedules/items/${applianceId}`),
    optimize: (projectId: string) => post<any>(`/projects/${projectId}/schedules/optimize`),
    applySuggestion: (projectId: string, applianceId: string, suggestedStartHour: number) =>
      post<any>(`/projects/${projectId}/schedules/optimize/apply/${applianceId}`, { suggestedStartHour }),
  },
  energyAnalysis: {
    analyze: (projectId: string) => get<any>(`/projects/${projectId}/energy-analysis`),
    simulate: (projectId: string, applianceIds: string[]) =>
      post<any>(`/projects/${projectId}/savings/simulate`, { applianceIds }),
  },
  reports: {
    list: (projectId: string) => get<any[]>(`/projects/${projectId}/reports`),
    create: (projectId: string, type = "PROJECT_SUMMARY", lineItems?: any[]) =>
      post<any>(`/projects/${projectId}/reports`, { type, lineItems }),
    get: (id: string) => get<any>(`/reports/${id}`),
    download: (id: string) => get<{ url: string }>(`/reports/${id}/download`),
  },
  notifications: {
    list: (unread?: boolean) => get<any[]>(`/notifications${unread ? "?unread=true" : ""}`),
    markRead: (id: string) => patch<any>(`/notifications/${id}/read`),
    markAllRead: () => post<any>("/notifications/read-all"),
  },
  installer: {
    clients: () => get<any[]>("/installer/clients"),
  },
  admin: {
    users: () => get<any[]>("/admin/users"),
    updateUser: (id: string, data: { role?: string; status?: string }) => patch<any>(`/admin/users/${id}`, data),
    deleteUser: (id: string) => del<any>(`/admin/users/${id}`),
    analyticsOverview: () => get<any>("/admin/analytics/overview"),
    analyticsAppliances: () => get<any>("/admin/analytics/appliances"),
    categories: () => get<any[]>("/appliances/categories"),
    createCategory: (data: { name: string; slug: string; icon?: string }) => post<any>("/admin/categories", data),
    createAppliance: (data: any) => post<any>("/admin/appliances", data),
    updateAppliance: (id: string, data: any) => patch<any>(`/admin/appliances/${id}`, data),
    deleteAppliance: (id: string) => del<any>(`/admin/appliances/${id}`),
    tariffs: () => get<any[]>("/tariffs"),
    createTariff: (data: any) => post<any>("/admin/tariffs", data),
    deleteTariff: (id: string) => del<any>(`/admin/tariffs/${id}`),
  },
};
