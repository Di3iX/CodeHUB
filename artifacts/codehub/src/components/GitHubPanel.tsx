import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  ChevronRight,
  ExternalLink,
  FileDiff,
  Github,
  GitBranch,
  Loader2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import DiffViewer from '@/components/DiffViewer';
import { branchService } from '@/services/github/branchService';
import { commitService } from '@/services/github/commitService';
import { GithubClientError } from '@/services/github/githubClient';
import { fileService } from '@/services/github/fileService';
import { repositoryService } from '@/services/github/repositoryService';
import type {
  GithubAccount,
  GithubBranch,
  GithubChange,
  GithubFile,
  GithubRepository,
} from '@/services/github/types';

type GitHubPanelProps = {
  currentContents: Record<string, string>;
  onClose: () => void;
  onOpenWorkspace: (files: GithubFile[], repository: GithubRepository, branch: string) => void;
};

function getErrorMessage(error: unknown): string {
  if (error instanceof GithubClientError) return error.message;
  if (error instanceof Error) return error.message;
  return 'GitHub request failed';
}

function buildChanges(
  currentContents: Record<string, string>,
  remoteFiles: GithubFile[] | null,
): GithubChange[] {
  if (!remoteFiles) return [];

  const remoteByPath = new Map(remoteFiles.map((file) => [file.path, file]));
  const paths = new Set([...remoteByPath.keys(), ...Object.keys(currentContents)]);

  return [...paths]
    .sort((left, right) => left.localeCompare(right))
    .flatMap((path) => {
      const remote = remoteByPath.get(path);
      const hasCurrent = Object.prototype.hasOwnProperty.call(currentContents, path);
      const before = remote?.content ?? null;
      const after = hasCurrent ? currentContents[path] : null;

      if (before === after) return [];

      return [{
        path,
        status: before === null ? 'added' : after === null ? 'deleted' : 'modified',
        before,
        after,
        sha: remote?.sha ?? null,
      } satisfies GithubChange];
    });
}

export default function GitHubPanel({
  currentContents,
  onClose,
  onOpenWorkspace,
}: GitHubPanelProps) {
  const [account, setAccount] = useState<GithubAccount | null>(null);
  const [repositories, setRepositories] = useState<GithubRepository[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<GithubRepository | null>(null);
  const [branches, setBranches] = useState<GithubBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [remoteFiles, setRemoteFiles] = useState<GithubFile[] | null>(null);
  const [selectedChangePath, setSelectedChangePath] = useState<string | null>(null);
  const [commitMessage, setCommitMessage] = useState('Update from CodeHub');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const changes = useMemo(
    () => buildChanges(currentContents, remoteFiles),
    [currentContents, remoteFiles],
  );
  const selectedChange = changes.find((change) => change.path === selectedChangePath) ?? changes[0] ?? null;

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([repositoryService.getAccount(), repositoryService.listRepositories()])
      .then(([nextAccount, nextRepositories]) => {
        if (!active) return;
        setAccount(nextAccount);
        setRepositories(nextRepositories);
        setError('');
      })
      .catch((requestError: unknown) => {
        if (active) setError(getErrorMessage(requestError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const selectRepository = async (repository: GithubRepository) => {
    setSelectedRepository(repository);
    setSelectedBranch('');
    setBranches([]);
    setRemoteFiles(null);
    setSelectedChangePath(null);
    setNotice('');
    setError('');
    setBusy(true);
    try {
      const nextBranches = await branchService.listBranches(repository.ownerLogin, repository.name);
      setBranches(nextBranches);
      setSelectedBranch(
        nextBranches.find((branch) => branch.name === repository.defaultBranch)?.name
          ?? nextBranches[0]?.name
          ?? repository.defaultBranch,
      );
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextAccount, nextRepositories] = await Promise.all([
        repositoryService.getAccount(),
        repositoryService.listRepositories(),
      ]);
      setAccount(nextAccount);
      setRepositories(nextRepositories);
      setNotice('Repositories refreshed');
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  };

  const openOrPull = async () => {
    if (!selectedRepository || !selectedBranch) return;
    if (changes.length > 0 && !window.confirm('Discard local changes and load the remote branch?')) return;

    setBusy(true);
    setError('');
    try {
      const files = await fileService.getBranchFiles(
        selectedRepository.ownerLogin,
        selectedRepository.name,
        selectedBranch,
      );
      setRemoteFiles(files);
      setSelectedChangePath(null);
      onOpenWorkspace(files, selectedRepository, selectedBranch);
      setNotice(`Loaded ${selectedRepository.fullName}@${selectedBranch}`);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  const commitAndPush = async () => {
    if (!selectedRepository || !selectedBranch || !commitMessage.trim() || changes.length === 0) return;

    setBusy(true);
    setError('');
    try {
      const result = await commitService.commitAndPush(
        selectedRepository.ownerLogin,
        selectedRepository.name,
        selectedBranch,
        commitMessage.trim(),
        changes,
      );
      const refreshedFiles = await fileService.getBranchFiles(
        selectedRepository.ownerLogin,
        selectedRepository.name,
        selectedBranch,
      );
      setRemoteFiles(refreshedFiles);
      setSelectedChangePath(null);
      onOpenWorkspace(refreshedFiles, selectedRepository, selectedBranch);
      setNotice(`Pushed ${result.sha.slice(0, 7)} to ${selectedBranch}`);
    } catch (requestError: unknown) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="github-drawer fixed inset-y-0 right-0 z-40 flex w-full max-w-[470px] flex-col border-l border-[#354159] bg-[#10162a] shadow-2xl shadow-black/40" aria-label="GitHub integration">
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e2a42] text-[#d8dfda]"><Github size={18} /></div>
          <div className="min-w-0">
            <p className="font-semibold tracking-[-.02em] text-[#eef2ed]">GitHub</p>
            <p className="truncate font-mono text-[9px] uppercase tracking-[.14em] text-[#657289]">
              {account ? `Connected as ${account.login}` : 'Repository workspace'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => void refresh()} className="rounded-md p-2 text-[#7f8ca2] hover:bg-white/[.06] hover:text-[#d8dfda]" aria-label="Refresh GitHub" data-testid="button-github-refresh">
            <RefreshCw size={15} />
          </button>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-[#7f8ca2] hover:bg-white/[.06] hover:text-[#d8dfda]" aria-label="Close GitHub" data-testid="button-github-close">
            <X size={17} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-[#6a3940] bg-[#321c27] px-3 py-2.5 text-[11px] text-[#efaaa4]" role="alert">
          <AlertCircle size={14} className="mt-0.5 shrink-0" />
          <span className="min-w-0 break-words">{error}</span>
        </div>
      )}

      {notice && !error && (
        <div className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-[#314d3c] bg-[#152b25] px-3 py-2.5 text-[11px] text-[#b6d898]">
          <Check size={14} className="shrink-0" />
          <span className="truncate">{notice}</span>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto">
        <section className="border-b border-[#252d40] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#657289]">Repositories</p>
              <p className="mt-1 text-xs text-[#b9c3c4]">{repositories.length} available repositories</p>
            </div>
            {loading && <Loader2 size={15} className="animate-spin text-[#56d2df]" />}
          </div>
          <div className="space-y-1.5">
            {repositories.map((repository) => (
              <button
                type="button"
                key={repository.id}
                onClick={() => void selectRepository(repository)}
                className={`flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors ${selectedRepository?.id === repository.id ? 'border-[#56d2df]/50 bg-[#56d2df]/10' : 'border-[#2a3347] bg-[#131a2d] hover:border-[#43506a]'}`}
                data-testid={`github-repository-${repository.id}`}
              >
                <Github size={14} className={selectedRepository?.id === repository.id ? 'text-[#56d2df]' : 'text-[#718096]'} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-medium text-[#d8dfda]">{repository.fullName}</span>
                  <span className="mt-0.5 block truncate text-[10px] text-[#718096]">{repository.description ?? 'No description'}</span>
                </span>
                <ChevronRight size={14} className="shrink-0 text-[#5d6b82]" />
              </button>
            ))}
            {!loading && repositories.length === 0 && (
              <div className="rounded-md border border-dashed border-[#354159] px-3 py-5 text-center font-mono text-[10px] text-[#657289]">No repositories found.</div>
            )}
          </div>
        </section>

        <section className="border-b border-[#252d40] p-4">
          <div className="mb-3 flex items-center gap-2">
            <GitBranch size={14} className="text-[#56d2df]" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#657289]">Branches</p>
              <p className="mt-1 text-xs text-[#b9c3c4]">{selectedRepository?.fullName ?? 'Select a repository'}</p>
            </div>
          </div>
          <select
            value={selectedBranch}
            onChange={(event) => { setSelectedBranch(event.target.value); setRemoteFiles(null); setSelectedChangePath(null); }}
            disabled={!selectedRepository || busy || branches.length === 0}
            className="w-full rounded-md border border-[#354159] bg-[#131a2d] px-3 py-2.5 font-mono text-[11px] text-[#d8dfda] outline-none focus:border-[#56d2df] disabled:opacity-50"
            aria-label="Select GitHub branch"
            data-testid="select-github-branch"
          >
            {!selectedBranch && <option value="">Select branch</option>}
            {branches.map((branch) => <option key={branch.name} value={branch.name}>{branch.name}</option>)}
          </select>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => void openOrPull()} disabled={!selectedRepository || !selectedBranch || busy} className="flex items-center justify-center gap-2 rounded-md bg-[#c1e84f] px-3 py-2.5 text-[11px] font-semibold text-[#10162a] hover:bg-[#d4f16e] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-github-open">
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
              Clone / Open
            </button>
            <button type="button" onClick={() => void openOrPull()} disabled={!selectedRepository || !selectedBranch || busy || !remoteFiles} className="flex items-center justify-center gap-2 rounded-md border border-[#354159] px-3 py-2.5 text-[11px] text-[#b9c3c4] hover:bg-white/[.05] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-github-pull">
              <RefreshCw size={14} />
              Pull
            </button>
          </div>
        </section>

        <section className="border-b border-[#252d40] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileDiff size={14} className="text-[#56d2df]" />
              <p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#657289]">Changes</p>
            </div>
            <span className="rounded-full bg-[#252d40] px-2 py-1 font-mono text-[9px] text-[#a7b2be]">{changes.length}</span>
          </div>
          <div className="space-y-1">
            {changes.map((change) => (
              <button
                type="button"
                key={change.path}
                onClick={() => setSelectedChangePath(change.path)}
                className={`flex w-full items-center gap-2 rounded px-2.5 py-2 text-left ${selectedChange?.path === change.path ? 'bg-[#56d2df]/10' : 'hover:bg-white/[.04]'}`}
                data-testid={`github-change-${change.path.replaceAll('/', '-')}`}
              >
                <span className={`font-mono text-[10px] ${change.status === 'added' ? 'text-[#b6d898]' : change.status === 'deleted' ? 'text-[#efaaa4]' : 'text-[#e6c981]'}`}>{change.status === 'added' ? '+' : change.status === 'deleted' ? '−' : '~'}</span>
                <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-[#c7d0d0]">{change.path}</span>
                <span className="font-mono text-[9px] uppercase text-[#657289]">{change.status}</span>
              </button>
            ))}
            {changes.length === 0 && (
              <p className="rounded-md border border-dashed border-[#354159] px-3 py-5 text-center font-mono text-[10px] text-[#657289]">
                {remoteFiles ? 'Working tree clean.' : 'Open a branch to compare changes.'}
              </p>
            )}
          </div>
        </section>

        <section className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Upload size={14} className="text-[#c1e84f]" />
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.17em] text-[#657289]">Commit</p>
              <p className="mt-1 text-xs text-[#b9c3c4]">Commit and push to the selected branch</p>
            </div>
          </div>
          <input
            value={commitMessage}
            onChange={(event) => setCommitMessage(event.target.value)}
            placeholder="Commit message"
            className="mb-2 w-full rounded-md border border-[#354159] bg-[#131a2d] px-3 py-2.5 font-mono text-[11px] text-[#d8dfda] outline-none placeholder:text-[#657289] focus:border-[#c1e84f]"
            aria-label="Commit message"
            data-testid="input-github-commit-message"
          />
          <button type="button" onClick={() => void commitAndPush()} disabled={!selectedRepository || !selectedBranch || !commitMessage.trim() || changes.length === 0 || busy} className="flex w-full items-center justify-center gap-2 rounded-md border border-[#53602d] bg-[#c1e84f]/10 px-3 py-2.5 text-[11px] font-semibold text-[#c1e84f] hover:bg-[#c1e84f]/20 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-github-commit">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Commit &amp; Push
          </button>
          {selectedRepository && (
            <a href={selectedRepository.htmlUrl} target="_blank" rel="noreferrer" className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[9px] text-[#718096] hover:text-[#56d2df]">
              Open repository on GitHub <ExternalLink size={11} />
            </a>
          )}
        </section>

        <DiffViewer change={selectedChange} />
      </div>
    </aside>
  );
}