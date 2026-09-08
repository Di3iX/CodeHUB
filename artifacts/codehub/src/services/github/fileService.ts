import { githubClient } from './githubClient';
import type { GithubFile } from './types';

const encode = (value: string) => encodeURIComponent(value);

export const fileService = {
  getBranchFiles(owner: string, repo: string, branch: string, signal?: AbortSignal) {
    return githubClient.get<GithubFile[]>(
      `/repositories/${encode(owner)}/${encode(repo)}/files?branch=${encode(branch)}`,
      signal,
    );
  },
};