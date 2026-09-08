export class GithubClientError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'GithubClientError';
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/github${path}`, {
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  });
  const raw = await response.text();
  let data: unknown = null;

  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'error' in data
      ? String(data.error)
      : `GitHub request failed with HTTP ${response.status}`;
    throw new GithubClientError(response.status, message);
  }

  return data as T;
}

export const githubClient = {
  get<T>(path: string, signal?: AbortSignal) {
    return request<T>(path, { method: 'GET', signal });
  },
  post<T>(path: string, body: unknown, signal?: AbortSignal) {
    return request<T>(path, {
      method: 'POST',
      signal,
      body: JSON.stringify(body),
    });
  },
};