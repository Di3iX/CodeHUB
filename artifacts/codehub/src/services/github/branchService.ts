import { githubClient } from './githubClient';
import type { GithubBranch } from './types';

const encode = (value: string) => encodeURIComponent(value);

export const branchService = {
  listBranches(owner: string, repo: string, signal?: AbortSignal) {
    return githubClient.get<GithubBranch[]>(
      `/repositories/${encode(owner)}/${encode(repo)}/branches`,
      signal,
    );
  },
};