/**
 * ImpactSensei v5.0 - Centralized API Service
 * Role-aware: admin | project_manager | client
 */

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

class APIError extends Error {
  constructor(
    public detail: string,
    public status: number,
  ) {
    super(detail);
    this.name = "APIError";
  }
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token = localStorage.getItem("access_token");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let resp = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  // Token refresh on 401
  if (resp.status === 401) {
    const rt = localStorage.getItem("refresh_token");
    if (rt) {
      try {
        const refreshResp = await fetch(`${BASE_URL}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: rt }),
        });
        if (refreshResp.ok) {
          const data = await refreshResp.json();
          localStorage.setItem("access_token", data.access_token);
          localStorage.setItem("refresh_token", data.refresh_token);
          headers["Authorization"] = `Bearer ${data.access_token}`;
          resp = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
        } else {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
          throw new APIError("Session expired", 401);
        }
      } catch {
        window.location.href = "/login";
        throw new APIError("Session expired", 401);
      }
    }
  }

  if (!resp.ok) {
    let detail = `HTTP ${resp.status}`;
    try {
      const err = await resp.json();
      detail = err.detail || err.message || detail;
    } catch {}
    throw new APIError(detail, resp.status);
  }

  if (resp.status === 204 || resp.headers.get("content-length") === "0")
    return {} as T;
  const ct = resp.headers.get("content-type") || "";
  if (ct.includes("text/csv")) return resp.blob() as unknown as T;
  return resp.json();
}

const get = <T>(url: string) => request<T>(url);
const post = <T>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
const put = <T>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
const del = <T>(url: string) => request<T>(url, { method: "DELETE" });
const patchFn = <T>(url: string, body?: unknown) =>
  request<T>(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });

// Expose raw helpers for new pages that need arbitrary endpoints
export { get as apiGet, post as apiPost, del as apiDelete, patchFn as apiPatch, put as apiPut };

export const api = {
  // Generic helpers (used by AdvancedAnalytics, Integrations, etc.)
  get: <T = unknown>(url: string) => get<T>(url),
  post: <T = unknown>(url: string, body?: unknown) => post<T>(url, body),
  delete: <T = unknown>(url: string) => del<T>(url),
  patch: <T = unknown>(url: string, body?: unknown) => patchFn<T>(url, body),
  put: <T = unknown>(url: string, body?: unknown) => put<T>(url, body),

  // ── AUTH ──────────────────────────────────────────────
  login: (email: string, password: string | undefined, remember_me = false, tfa_code?: string, login_role?: string, tfa_mode = false) =>
    post<unknown>("/auth/login", { email, password, remember_me, tfa_code, login_role, tfa_mode }),
  register: (data: unknown) => post<unknown>("/auth/register", data),
  logout: () => post<unknown>("/auth/logout"),
  refreshToken: (refresh_token: string) =>
    post<unknown>("/auth/refresh", { refresh_token }),
  getMe: () => get<unknown>("/auth/me"),
  updateProfile: (data: unknown) => put<unknown>("/auth/me", data),
  changePassword: (data: unknown) => post<unknown>("/auth/change-password", data),
  forgotPassword: (email: string) =>
    post<unknown>("/auth/forgot-password", { email }),
  resetPassword: (data: unknown) => post<unknown>("/auth/reset-password", data),
  verifyEmail: (token: string) => post<unknown>("/auth/verify-email", { token }),
  resendVerification: (email: string) =>
    post<unknown>("/auth/resend-verification", { email }),

  // ── PUBLIC ────────────────────────────────────────────
  getPublicSettings: () => get<unknown>("/settings/public"),
  refreshCurrency: () => post<unknown>("/currency/refresh"),
  health: () => get<unknown>("/health"),

  // ── ADMIN — USERS ─────────────────────────────────────
  getAdminUsers: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<unknown>(`/admin/users${q ? "?" + q : ""}`);
  },
  createAdminUser: (data: unknown) => post<unknown>("/admin/users", data),
  updateAdminUser: (id: number, data: unknown) =>
    put<unknown>(`/admin/users/${id}`, data),
  deleteAdminUser: (id: number) => del<unknown>(`/admin/users/${id}`),
  updateUserRole: (id: number, role: string) =>
    put<unknown>(`/admin/users/${id}/role`, { role }),
  verifyUser: (id: number, role: string) =>
    patchFn<unknown>(`/admin/users/${id}/verify`, { role }),

  // ── ADMIN — COMPANIES ─────────────────────────────────
  getCompanies: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<unknown>(`/admin/companies${q ? "?" + q : ""}`);
  },
  getCompany: (id: number) => get<unknown>(`/admin/companies/${id}`),
  createCompany: (data: unknown) => post<unknown>("/admin/companies", data),
  updateCompany: (id: number, data: unknown) =>
    put<unknown>(`/admin/companies/${id}`, data),
  deleteCompany: (id: number) => del<unknown>(`/admin/companies/${id}`),
  assignPMToCompany: (companyId: number, userId: number) =>
    post<unknown>(`/admin/companies/${companyId}/assign-pm?user_id=${userId}`),

  // ── ADMIN — ANALYTICS / SETTINGS / AUDIT ─────────────
  getAdminOverview: () => get<unknown>("/admin/analytics/overview"),
  getAdminUserAnalytics: (period = "month") =>
    get<unknown>(`/admin/analytics/users?period=${period}`),
  getAdminProjectAnalytics: () => get<unknown>("/admin/analytics/projects"),
  getAuditLogs: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<unknown>(`/admin/audit-logs${q ? "?" + q : ""}`);
  },
  getSettings: () => get<unknown>("/admin/settings"),
  updateSetting: (key: string, value: string) =>
    put<unknown>(`/admin/settings/${encodeURIComponent(key)}`, { value }),

  // ── PROJECTS ──────────────────────────────────────────
  getProjects: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<any[]>(`/projects${q ? "?" + q : ""}`);
  },
  createProject: (data: unknown) => post<unknown>("/projects", data),
  getProject: (id: number) => get<unknown>(`/projects/${id}`),
  updateProject: (id: number, data: unknown) => put<unknown>(`/projects/${id}`, data),
  deleteProject: (id: number) => del<unknown>(`/projects/${id}`),
  getProjectMembers: (id: number) => get<unknown>(`/projects/${id}/members`),
  addProjectMember: (id: number, data: unknown) =>
    post<unknown>(`/projects/${id}/members`, data),
  removeProjectMember: (projectId: number, userId: number) =>
    del<unknown>(`/projects/${projectId}/members/${userId}`),
  linkProjectClient: (projectId: number, data: unknown) =>
    post<unknown>(`/projects/${projectId}/clients`, data),
  getProjectAnalytics: (id: number) => get<unknown>(`/projects/${id}/analytics`),

  // ── REQUIREMENTS ─────────────────────────────────────
  getRequirements: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<any[]>(`/requirements${q ? "?" + q : ""}`);
  },
  createRequirement: (data: unknown) => post<unknown>("/requirements", data),
  updateRequirement: (id: number, data: unknown) =>
    put<unknown>(`/requirements/${id}`, data),
  deleteRequirement: (id: number) => del<unknown>(`/requirements/${id}`),

  // ── CHANGE REQUESTS ───────────────────────────────────
  getChangeRequests: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<any[]>(`/change-requests${q ? "?" + q : ""}`);
  },
  getChangeRequest: (id: number) => get<unknown>(`/change-requests/${id}`),
  submitChangeRequest: (id: number) =>
    post<unknown>(`/change-requests/${id}/submit`),
  approveChangeRequest: (id: number, comment?: string) =>
    post<unknown>(`/change-requests/${id}/approve`, { comment }),
  rejectChangeRequest: (id: number, reason?: string) =>
    post<unknown>(`/change-requests/${id}/reject`, { comment: reason }),

  // ── ANALYSIS ─────────────────────────────────────────
  runAnalysis: (data: unknown) => post<unknown>("/analyze", data),
  getAnalysis: (id: number) => get<unknown>(`/analyses/${id}`),

  // ── SCENARIOS ─────────────────────────────────────────
  getScenarios: (params?: unknown) => {
    const q = new URLSearchParams(params || {}).toString();
    return get<any[]>(`/scenarios${q ? "?" + q : ""}`);
  },
  createScenario: (data: unknown) => post<unknown>("/scenarios", data),
  updateScenario: (id: number, data: unknown) => put<unknown>(`/scenarios/${id}`, data),
  deleteScenario: (id: number) => del<unknown>(`/scenarios/${id}`),
  compareScenarios: (ids: number[]) =>
    post<unknown>("/scenarios/compare", { scenario_ids: ids }),

  // ── COMMENTS ──────────────────────────────────────────
  getComments: (entityType: string, entityId: number) =>
    get<any[]>(`/comments/${entityType}/${entityId}`),
  addComment: (data: unknown) => post<unknown>("/comments", data),
  updateComment: (id: number, content: string) =>
    put<unknown>(`/comments/${id}`, { content }),
  deleteComment: (id: number) => del<unknown>(`/comments/${id}`),

  // ── NOTIFICATIONS ─────────────────────────────────────
  getNotifications: () => get<any[]>("/notifications"),
  markNotificationRead: (id: number) => put<unknown>(`/notifications/${id}/read`),
  markNotificationUnread: (id: number) => put<unknown>(`/notifications/${id}/unread`),
  markAllRead: () => put<unknown>("/notifications/read-all"),
  deleteNotification: (id: number) => del<unknown>(`/notifications/${id}`),

  // ── REPORTS ───────────────────────────────────────────
  getProjectReport: (id: number) => get<unknown>(`/reports/project/${id}`),
  getTeamReport: () => get<unknown>("/reports/team"),
  getAnalysisReport: (id: number) => get<unknown>(`/reports/analysis/${id}`),

  // ── TEMPLATES ─────────────────────────────────────────
  getTemplates: () => get<any[]>("/templates"),
  createTemplate: (data: unknown) => post<unknown>("/templates", data),
  updateTemplate: (id: number, data: unknown) => put<unknown>(`/templates/${id}`, data),
  deleteTemplate: (id: number) => del<unknown>(`/templates/${id}`),
  applyTemplate: (id: number, variables?: unknown) =>
    post<unknown>(`/templates/${id}/apply`, { variables }),

  // ── 2FA (TOTP) ────────────────────────────────────────
  setup2FA: () => post<unknown>("/auth/2fa/setup"),
  verify2FA: (code: string) => post<unknown>("/auth/2fa/verify", { code }),
  disable2FA: (code: string) => post<unknown>("/auth/2fa/disable", { code }),
  get2FAStatus: () => get<unknown>("/auth/2fa/status"),
  getBackupCodes: () => get<unknown>("/auth/2fa/backup-codes"),

  // ── ANALYTICS ─────────────────────────────────────────
  getPredictions: (weeks = 6, project_id?: number) =>
    get<unknown>(`/analytics/predictions?weeks=${weeks}${project_id ? `&project_id=${project_id}` : ""}`),
  getAnomalies: (project_id?: number, threshold = 2.0) =>
    get<unknown>(`/analytics/anomalies?threshold=${threshold}${project_id ? `&project_id=${project_id}` : ""}`),
  getUsageAnalytics: (period = "month") => get<unknown>(`/analytics/usage?period=${period}`),
  getSprintForecast: (sprints = 4, project_id?: number) =>
    get<unknown>(`/analytics/forecast/sprints?sprints=${sprints}${project_id ? `&project_id=${project_id}` : ""}`),
  analyzeSentiment: (text: string) =>
    post<unknown>("/analytics/sentiment", { text }),
  getThreadSentiment: (entityType: string, entityId: number) =>
    get<unknown>(`/analytics/sentiment/thread/${entityType}/${entityId}`),

  // ── WEBHOOKS ──────────────────────────────────────────
  getWebhooks: () => get<any[]>("/integrations/webhooks"),
  createWebhook: (data: unknown) => post<unknown>("/integrations/webhooks", data),
  deleteWebhook: (id: number) => del<unknown>(`/integrations/webhooks/${id}`),
  testWebhook: (id: number) => post<unknown>(`/integrations/webhooks/${id}/test`, {}),

  // ── PROJECT MANAGEMENT (Sprints, Gantt, SLA, Roadmap) ─
  getSprints: (projectId: number) => get<any[]>(`/sprints/${projectId}`),
  createSprint: (data: unknown) => post<unknown>("/sprints", data),
  getSprintTasks: (sprintId: number) => get<any[]>(`/sprints/${sprintId}/tasks`),
  createSprintTask: (sprintId: number, data: unknown) => post<unknown>(`/sprints/${sprintId}/tasks`, data),
  updateSprintTask: (sprintId: number, taskId: number, data: unknown) => put<unknown>(`/sprints/${sprintId}/tasks/${taskId}`, data),
  getGantt: (projectId: number) => get<unknown>(`/gantt/${projectId}`),
  getBurndown: (sprintId: number) => get<unknown>(`/burndown/${sprintId}`),
  getRoadmap: (companyId: number) => get<unknown>(`/roadmap/${companyId}`),
  getSLADashboard: () => get<unknown>("/sla/dashboard"),
  getSLAConfig: () => get<any[]>("/sla/config"),
  updateSLAConfig: (data: unknown) => post<unknown>("/sla/config", data),
  getSurveys: (projectId: number) => get<unknown>(`/satisfaction/${projectId}`),
  submitSurvey: (projectId: number, data: unknown) => post<unknown>(`/satisfaction/${projectId}`, data),

  // ── SCHEDULED REPORTS ─────────────────────────────────
  getScheduledReports: () => get<any[]>("/reports/scheduled"),
  createScheduledReport: (data: unknown) => post<unknown>("/reports/scheduled", data),
  updateScheduledReport: (id: number, data: unknown) => put<unknown>(`/reports/scheduled/${id}`, data),
  deleteScheduledReport: (id: number) => del<unknown>(`/reports/scheduled/${id}`),

  // ── SECURITY SETTINGS (Admin) ─────────────────────────
  getIPWhitelist: () => get<any[]>("/admin/ip-whitelist"),
  addIPWhitelist: (data: unknown) => post<unknown>("/admin/ip-whitelist", data),
  removeIPWhitelist: (id: number) => del<unknown>(`/admin/ip-whitelist/${id}`),
  getEncryptionStatus: () => get<unknown>("/admin/encryption/status"),
  rotateEncryptionKey: () => post<unknown>("/admin/encryption/rotate-key", {}),
};

