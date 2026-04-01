// API Client — fetch wrapper com auth e interceptors
const CRM_BASE_URL = '/api/crm';
const ECO_BASE_URL = '/api';

function getToken(): string | null {
  return localStorage.getItem('auth_token');
}

function handleUnauthorized() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_user');
  // Não redireciona — evita loop infinito com AutoAuth + Navigate
  // O React Query mostrará o erro e o usuário pode recarregar manualmente
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

async function request<T>(path: string, options: RequestOptions & { baseUrl?: string } = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, baseUrl = CRM_BASE_URL } = options;
  const url = `${baseUrl}${path}`;

  const token = getToken();
  const authHeaders: Record<string, string> = token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const contentHeaders: Record<string, string> =
    body !== undefined ? { 'Content-Type': 'application/json' } : {};

  const allHeaders = { ...authHeaders, ...contentHeaders, ...headers };

  const response = await fetch(url, {
    method,
    headers: allHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401) {
    handleUnauthorized();
    throw new Error('Não autorizado. Redirecionando para login.');
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch { /* ignore */ }
    throw new Error(errorMessage);
  }

  if (response.status === 204) return undefined as unknown as T;

  return await response.json() as T;
}

function createClient(baseUrl: string) {
  return {
    get<T>(path: string, headers?: Record<string, string>): Promise<T> {
      return request<T>(path, { method: 'GET', headers, baseUrl });
    },
    post<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
      return request<T>(path, { method: 'POST', body, headers, baseUrl });
    },
    put<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
      return request<T>(path, { method: 'PUT', body, headers, baseUrl });
    },
    patch<T>(path: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
      return request<T>(path, { method: 'PATCH', body, headers, baseUrl });
    },
    del<T>(path: string, headers?: Record<string, string>): Promise<T> {
      return request<T>(path, { method: 'DELETE', headers, baseUrl });
    },
  };
}

// CRM API client (/api/crm/*)
export const apiClient = createClient(CRM_BASE_URL);

// Ecosystem API client (/api/*)
export const ecoClient = createClient(ECO_BASE_URL);
