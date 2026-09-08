import { githubClient } from './githubClient';
import type { GithubAccount, GithubRepository } from './types';

export const repositoryService = {
  getAccount(signal?: AbortSignal) {
    return githubClient.get<GithubAccount>('/account', signal);
  },

  listRepositories(signal?: AbortSignal) {
    return githubClient.get<GithubRepository[]>('/repositories', signal);
  },
};