/**
 * API client — uses internal Next.js API routes (no external backend).
 * All requests go to /api/* on the same origin.
 */

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

async function apiFetch<T = any>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...(init?.headers as Record<string, string>) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(init?.body instanceof FormData)) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  }

  const res = await fetch(path, { ...init, headers });

  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail || 'API hatası');
  }

  // Handle blob responses (e.g. Excel export)
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('spreadsheet') || ct.includes('octet-stream')) {
    return res.blob() as any;
  }

  return res.json();
}

// Auth
export const authRegister = (data: { email: string; full_name: string; password: string; role?: string; uzmanlik?: string }) =>
  apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(data) });
export const authLogin = (data: { email: string; password: string }) =>
  apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(data) });
export const authMe = () => apiFetch('/api/auth/me');

// Users
export const getUsers = () => apiFetch('/api/users');

// Projects
export const getProjects = () => apiFetch('/api/projects');
export const getProject = (id: number) => apiFetch(`/api/projects/${id}`);
export const uploadProject = (file: File) => {
  const fd = new FormData();
  fd.append('file', file);
  return apiFetch('/api/projects', { method: 'POST', body: fd });
};
export const deleteProject = (id: number) =>
  apiFetch(`/api/projects/${id}`, { method: 'DELETE' });

// Project items
export const getItems = (id: number, params: Record<string, any> = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
  return apiFetch(`/api/projects/${id}/items?${qs}`);
};
export const updateItem = (pid: number, iid: number, data: any) =>
  apiFetch(`/api/projects/${pid}/items/${iid}`, { method: 'PATCH', body: JSON.stringify(data) });
export const getItemHistory = (pid: number, iid: number) =>
  apiFetch(`/api/projects/${pid}/items/${iid}/history`);

// Project stats/nav/export
export const getStats = (id: number) => apiFetch(`/api/projects/${id}/stats`);
export const getNav = (id: number) => apiFetch(`/api/projects/${id}/nav`);
export const exportProject = (id: number) => apiFetch(`/api/projects/${id}/export`);
export const exportProjectUrl = (id: number) => `/api/projects/${id}/export`;

// Tasks
export const getTasks = (params: Record<string, any> = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
  return apiFetch(`/api/tasks?${qs}`);
};
export const getTask = (id: number) => apiFetch(`/api/tasks/${id}`);
export const createTask = (data: { projectId: number; assignedToId?: number; title: string; description?: string; priority?: string; bomItemIds: number[] }) =>
  apiFetch('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
export const updateTask = (id: number, data: any) =>
  apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteTask = (id: number) =>
  apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });

// Calendar
export const getCalendarEvents = (params: Record<string, any> = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v != null && v !== '') qs.set(k, String(v)); });
  return apiFetch(`/api/calendar?${qs}`);
};
export const createCalendarEvent = (data: any) =>
  apiFetch('/api/calendar', { method: 'POST', body: JSON.stringify(data) });
export const updateCalendarEvent = (id: number, data: any) =>
  apiFetch(`/api/calendar/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteCalendarEvent = (id: number) =>
  apiFetch(`/api/calendar/${id}`, { method: 'DELETE' });

// Users management (admin)
export const createUser = (data: { email: string; full_name: string; password: string; role: string; uzmanlik?: string }) =>
  apiFetch('/api/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id: number, data: any) =>
  apiFetch(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
export const deleteUser = (id: number) =>
  apiFetch(`/api/users/${id}`, { method: 'DELETE' });
