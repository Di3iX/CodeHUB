import { Router, type IRouter } from "express";
import {
  CommitGithubChangesBody,
  CommitGithubChangesParams,
  GetGithubFilesParams,
  GetGithubFilesQueryParams,
  ListGithubBranchesParams,
  ListGithubRepositoriesResponse,
  GithubAccountResponse,
  CommitGithubChangesResponse,
  GetGithubFilesResponse,
  ListGithubBranchesResponse,
} from "@workspace/api-zod";
import {
  githubPathSegment,
  githubRepositoryPath,
  githubRequest,
  GithubUpstreamError,
} from "../lib/github-client";

type GithubUser = {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
};

type GithubRepository = {
  id: number;
  name: string;
  full_name: string;
  owner: { login: string };
  description: string | null;
  default_branch: string;
  private: boolean;
  html_url: string;
  updated_at: string | null;
};

type GithubBranch = {
  name: string;
  protected: boolean;
  commit: { sha: string };
};

type GithubTree = {
  truncated: boolean;
  tree: Array<{
    path: string;
    mode: string;
    type: "blob" | "tree" | "commit";
    sha: string;
    size?: number;
  }>;
};

type GithubBlobContent = {
  encoding?: string;
  content?: string;
  sha: string;
};

type GithubRef = {
  object: { sha: string };
};

type GithubCommit = {
  tree: { sha: string };
};

type GithubBlob = {
  sha: string;
};

type GithubTreeResponse = {
  sha: string;
};

type GithubCreatedCommit = {
  sha: string;
  html_url: string;
  message: string;
};

const router: IRouter = Router();
const MAX_SNAPSHOT_FILES = 500;

function sendGithubError(req: Parameters<Parameters<IRouter["get"]>[1]>[0], res: Parameters<Parameters<IRouter["get"]>[1]>[1], error: unknown): void {
  if (error instanceof GithubUpstreamError) {
    req.log.warn({ status: error.status, message: error.message }, "GitHub upstream request failed");
    res.status(502).json({ error: error.message });
    return;
  }

  req.log.error({ err: error }, "GitHub integration request failed");
  res.status(500).json({ error: "GitHub integration request failed" });
}

function encodeContent(content: string): string {
  return Buffer.from(content, "utf8").toString("base64");
}

function decodeContent(content: string): string {
  return Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf8");
}

async function mapWithConcurrency<T, R>(
  items: T[],
  mapper: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index]);
    }
  }

  await Promise.all(
    Array.from(
      { length: Math.min(Math.max(1, concurrency), items.length) },
      () => worker(),
    ),
  );

  return results;
}

router.get("/github/account", async (req, res): Promise<void> => {
  try {
    const user = await githubRequest<GithubUser>("/user");
    res.json(GithubAccountResponse.parse({
      login: user.login,
      name: user.name,
      avatarUrl: user.avatar_url,
      htmlUrl: user.html_url,
    }));
  } catch (error) {
    sendGithubError(req, res, error);
  }
});

router.get("/github/repositories", async (req, res): Promise<void> => {
  try {
    const repositories = await githubRequest<GithubRepository[]>(
      "/user/repos?sort=pushed&per_page=100&affiliation=owner,collaborator,organization_member",
    );
    res.json(ListGithubRepositoriesResponse.parse(repositories.map((repository) => ({
      id: repository.id,
      name: repository.name,
      fullName: repository.full_name,
      ownerLogin: repository.owner.login,
      description: repository.description,
      defaultBranch: repository.default_branch,
      private: repository.private,
      htmlUrl: repository.html_url,
      updatedAt: repository.updated_at,
    }))));
  } catch (error) {
    sendGithubError(req, res, error);
  }
});

router.get("/github/repositories/:owner/:repo/branches", async (req, res): Promise<void> => {
  const parsedParams = ListGithubBranchesParams.safeParse(req.params);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }

  try {
    const branches = await githubRequest<GithubBranch[]>(
      `${githubRepositoryPath(parsedParams.data.owner, parsedParams.data.repo)}/branches?per_page=100`,
    );
    res.json(ListGithubBranchesResponse.parse(branches.map((branch) => ({
      name: branch.name,
      sha: branch.commit.sha,
      protected: branch.protected,
    }))));
  } catch (error) {
    sendGithubError(req, res, error);
  }
});

router.get("/github/repositories/:owner/:repo/files", async (req, res): Promise<void> => {
  const parsedParams = GetGithubFilesParams.safeParse(req.params);
  const parsedQuery = GetGithubFilesQueryParams.safeParse(req.query);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }
  if (!parsedQuery.success) {
    res.status(400).json({ error: parsedQuery.error.message });
    return;
  }

  try {
    const repositoryPath = githubRepositoryPath(
      parsedParams.data.owner,
      parsedParams.data.repo,
    );
    const branch = parsedQuery.data.branch;
    const tree = await githubRequest<GithubTree>(
      `${repositoryPath}/git/trees/${githubPathSegment(branch)}?recursive=1`,
    );
    const files = tree.tree.filter((entry) => entry.type === "blob");

    if (tree.truncated || files.length > MAX_SNAPSHOT_FILES) {
      throw new GithubUpstreamError(
        413,
        `Repository snapshot is too large. CodeHub supports up to ${MAX_SNAPSHOT_FILES} files per open operation.`,
      );
    }

    const snapshot = await mapWithConcurrency(files, async (entry) => {
      const content = await githubRequest<GithubBlobContent>(
        `${repositoryPath}/git/blobs/${githubPathSegment(entry.sha)}`,
      );
      return {
        path: entry.path,
        content: content.encoding === "base64" && content.content
          ? decodeContent(content.content)
          : content.content ?? "",
        sha: content.sha,
      };
    }, 3);

    res.json(GetGithubFilesResponse.parse(snapshot));
  } catch (error) {
    sendGithubError(req, res, error);
  }
});

router.post("/github/repositories/:owner/:repo/commit", async (req, res): Promise<void> => {
  const parsedParams = CommitGithubChangesParams.safeParse(req.params);
  const parsedBody = CommitGithubChangesBody.safeParse(req.body);
  if (!parsedParams.success) {
    res.status(400).json({ error: parsedParams.error.message });
    return;
  }
  if (!parsedBody.success) {
    res.status(400).json({ error: parsedBody.error.message });
    return;
  }

  try {
    const repositoryPath = githubRepositoryPath(
      parsedParams.data.owner,
      parsedParams.data.repo,
    );
    const { branch, message, changes } = parsedBody.data;
    const ref = await githubRequest<GithubRef>(
      `${repositoryPath}/git/ref/heads/${githubPathSegment(branch)}`,
    );
    const baseCommit = await githubRequest<GithubCommit>(
      `${repositoryPath}/git/commits/${githubPathSegment(ref.object.sha)}`,
    );

    const treeEntries = await Promise.all(changes.map(async (change) => {
      if (change.status === "deleted") {
        return {
          path: change.path,
          mode: "100644",
          type: "blob" as const,
          sha: null,
        };
      }

      if (change.content === null) {
        throw new GithubUpstreamError(400, `Missing content for ${change.path}`);
      }

      const blob = await githubRequest<GithubBlob>(`${repositoryPath}/git/blobs`, {
        method: "POST",
        body: {
          content: encodeContent(change.content),
          encoding: "base64",
        },
      });

      return {
        path: change.path,
        mode: "100644",
        type: "blob" as const,
        sha: blob.sha,
      };
    }));

    const tree = await githubRequest<GithubTreeResponse>(`${repositoryPath}/git/trees`, {
      method: "POST",
      body: {
        base_tree: baseCommit.tree.sha,
        tree: treeEntries,
      },
    });
    const commit = await githubRequest<GithubCreatedCommit>(`${repositoryPath}/git/commits`, {
      method: "POST",
      body: {
        message,
        tree: tree.sha,
        parents: [ref.object.sha],
      },
    });
    await githubRequest(`${repositoryPath}/git/refs/heads/${githubPathSegment(branch)}`, {
      method: "PATCH",
      body: { sha: commit.sha, force: false },
    });

    res.json(CommitGithubChangesResponse.parse({
      sha: commit.sha,
      url: commit.html_url,
      message: commit.message,
    }));
  } catch (error) {
    sendGithubError(req, res, error);
  }
});

export default router;