import { githubClient } from './githubClient';
import type { GithubChange, GithubCommitResult } from './types';

const encode = (value: string) => encodeURIComponent(value);

export const commitService = {
  commitAndPush(
    owner: string,
    repo: string,
    branch: string,
    message: string,
    changes: GithubChange[],
    signal?: AbortSignal,
  ) {
    return githubClient.post<GithubCommitResult>(
      `/repositories/${encode(owner)}/${encode(repo)}/commit`,
      {
        branch,
        message,
        changes: changes.map(({ path, status, after, sha }) => ({
          path,
          status,
          content: after,
          sha,
        })),
      },
      signal,
    );
  },
};