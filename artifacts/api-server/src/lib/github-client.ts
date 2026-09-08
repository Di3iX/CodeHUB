import { ReplitConnectors } from "@replit/connectors-sdk";

type GithubRequestInit = {
  method?: string;
  body?: unknown;
};

export class GithubUpstreamError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "GithubUpstreamError";
    this.status = status;
  }
}

export async function githubRequest<T>(
  path: string,
  init: GithubRequestInit = {},
): Promise<T> {
  const method = init.method ?? "GET";
  const response = await new ReplitConnectors().proxy("github", path, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
  });

  const rawBody = await response.text();
  let data: unknown = null;

  if (rawBody) {
    try {
      data = JSON.parse(rawBody);
    } catch {
      data = rawBody;
    }
  }

  if (!response.ok) {
    const message = typeof data === "object" && data !== null && "message" in data
      ? String(data.message)
      : `GitHub request failed with HTTP ${response.status}`;
    throw new GithubUpstreamError(response.status, message);
  }

  return data as T;
}

export function githubPathSegment(value: string): string {
  return encodeURIComponent(value);
}

export function githubRepositoryPath(owner: string, repo: string): string {
  return `/repos/${githubPathSegment(owner)}/${githubPathSegment(repo)}`;
}