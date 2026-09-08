export type GithubChangeStatus = 'added' | 'modified' | 'deleted';

export type GithubAccount = {
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
};

export type GithubRepository = {
  id: number;
  name: string;
  fullName: string;
  ownerLogin: string;
  description: string | null;
  defaultBranch: string;
  private: boolean;
  htmlUrl: string;
  updatedAt: string | null;
};

export type GithubBranch = {
  name: string;
  sha: string;
  protected: boolean;
};

export type GithubFile = {
  path: string;
  content: string;
  sha: string;
};

export type GithubChange = {
  path: string;
  status: GithubChangeStatus;
  before: string | null;
  after: string | null;
  sha: string | null;
};

export type GithubCommitResult = {
  sha: string;
  url: string;
  message: string;
};