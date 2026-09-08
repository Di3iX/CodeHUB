import { useEffect, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import CodeEditor from '@/components/CodeEditor';
import Explorer from '@/components/Explorer';
import GitHubPanel from '@/components/GitHubPanel';
import TerminalPanel from '@/components/TerminalPanel';
import PreviewPanel from '@/components/PreviewPanel';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  countFiles,
  findFirstFile,
  findNode,
  getFileKind,
  getParentPath,
  getNodePath,
  initialContents,
  initialFileSystem,
  insertNode,
  nodeExistsInParent,
  removeNode,
  renameNode,
  updateContentPaths,
  type FileNode,
} from '@/lib/mock-file-system';
import { buildFileSystemFromGithubFiles } from '@/lib/github-file-system';
import type { GithubFile, GithubRepository } from '@/services/github/types';
import {
  initialTerminalTranscript,
  MockTerminalService,
  type TerminalLine,
  type TerminalService,
} from '@/lib/terminal-service';
import {
  MockRuntimeManager,
  type RuntimeManager,
  type RuntimeSnapshot,
} from '@/lib/runtime-manager';
import NotFound from '@/pages/not-found';
import {
  Bot,
  Code2,
  FileCode2,
  Folder,
  Github,
  Globe2,
  Menu,
  Monitor,
  Play,
  RotateCw,
  Search,
  Settings2,
  Share2,
  Smartphone,
  Sparkles,
  Square,
  Terminal as TerminalIcon,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type MobileView = 'files' | 'code' | 'preview' | 'terminal' | 'ai';

function Home() {
  const [fileSystem, setFileSystem] = useState<FileNode>(initialFileSystem);
  const [selectedPath, setSelectedPath] = useState('src/App.tsx');
  const [contents, setContents] = useState(initialContents);
  const [savedContents, setSavedContents] = useState(initialContents);
  const [openTabs, setOpenTabs] = useState(['src/App.tsx']);
  const [mobileView, setMobileView] = useState<MobileView>('code');
  const runtimeManager = useRef<RuntimeManager>(new MockRuntimeManager());
  const [runtime, setRuntime] = useState<RuntimeSnapshot>(() => runtimeManager.current.getSnapshot());
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [terminalHeight, setTerminalHeight] = useState(218);
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(initialTerminalTranscript);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([]);
  const [previewKey, setPreviewKey] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const [notice, setNotice] = useState('Ready');
  const terminalService = useRef<TerminalService>(new MockTerminalService());
  const terminalLineId = useRef(0);

  useEffect(() => runtimeManager.current.subscribe((event) => {
    if (event.type === 'snapshot') {
      setRuntime(event.snapshot);
      setNotice(event.snapshot.status === 'STARTING'
        ? 'Starting runtime'
        : event.snapshot.status === 'RUNNING'
          ? 'Runtime running'
          : event.snapshot.status === 'ERROR'
            ? 'Runtime error'
            : 'Runtime stopped');
      return;
    }

    setTerminalLines((current) => [
      ...current,
      {
        id: `runtime-${terminalLineId.current++}`,
        kind: event.log.level === 'error' ? 'stderr' : 'system',
        text: event.log.text,
      },
    ]);
  }), []);

  const selectFile = (path: string) => {
    const node = findNode(fileSystem, path);
    if (!node || node.type !== 'file') return;
    setSelectedPath(path);
    setOpenTabs((current) => current.includes(path) ? current : [...current, path]);
    setMobileView('code');
    setNotice(`Opened ${path}`);
  };

  const createFile = (parentPath: string, name: string) => {
    const cleanName = name.trim();
    const parent = findNode(fileSystem, parentPath);
    if (!cleanName || cleanName.includes('/') || !parent || parent.type !== 'folder') {
      setNotice('Choose a valid file name');
      return false;
    }
    if (nodeExistsInParent(fileSystem, parentPath, cleanName)) {
      setNotice(`${cleanName} already exists here`);
      return false;
    }

    const path = getNodePath(parentPath, cleanName);
    const kind = getFileKind(cleanName);
    const starter = kind === 'json' ? '{}\n' : kind === 'md' ? `# ${cleanName.replace(/\.[^.]+$/, '')}\n` : '';
    setFileSystem((current) => insertNode(current, parentPath, { path, name: cleanName, type: 'file', kind }));
    setContents((current) => ({ ...current, [path]: starter }));
    setSavedContents((current) => ({ ...current, [path]: starter }));
    setOpenTabs((current) => [...current, path]);
    setSelectedPath(path);
    setNotice(`Created ${path}`);
    return true;
  };

  const createFolder = (parentPath: string, name: string) => {
    const cleanName = name.trim();
    const parent = findNode(fileSystem, parentPath);
    if (!cleanName || cleanName.includes('/') || !parent || parent.type !== 'folder') {
      setNotice('Choose a valid folder name');
      return false;
    }
    if (nodeExistsInParent(fileSystem, parentPath, cleanName)) {
      setNotice(`${cleanName} already exists here`);
      return false;
    }

    const path = getNodePath(parentPath, cleanName);
    setFileSystem((current) => insertNode(current, parentPath, {
      path,
      name: cleanName,
      type: 'folder',
      children: [],
    }));
    setNotice(`Created ${path}`);
    return true;
  };

  const renamePath = (path: string, name: string) => {
    const cleanName = name.trim();
    const node = findNode(fileSystem, path);
    const parentPath = getParentPath(path);
    const parent = findNode(fileSystem, parentPath);
    if (!cleanName || cleanName.includes('/') || !node || !parent || node.path === '' || nodeExistsInParent(fileSystem, parentPath, cleanName, path)) {
      setNotice('Choose a unique name');
      return false;
    }

    const nextPath = getNodePath(parentPath, cleanName);
    setFileSystem((current) => renameNode(current, path, cleanName));
    setContents((current) => updateContentPaths(current, path, nextPath));
    setSavedContents((current) => updateContentPaths(current, path, nextPath));
    setOpenTabs((current) => current.map((openPath) => (
      openPath === path || openPath.startsWith(`${path}/`)
        ? `${nextPath}${openPath.slice(path.length)}`
        : openPath
    )));
    if (selectedPath === path || selectedPath.startsWith(`${path}/`)) {
      setSelectedPath(`${nextPath}${selectedPath.slice(path.length)}`);
    }
    setNotice(`Renamed to ${nextPath}`);
    return true;
  };

  const deletePath = (path: string) => {
    const node = findNode(fileSystem, path);
    if (!node || path === '') return;

    const nextFileSystem = removeNode(fileSystem, path);
    setFileSystem(nextFileSystem);
    setContents((current) => Object.fromEntries(
      Object.entries(current).filter(([contentPath]) => (
        contentPath !== path && !contentPath.startsWith(`${path}/`)
      )),
    ));
    setSavedContents((current) => Object.fromEntries(
      Object.entries(current).filter(([contentPath]) => (
        contentPath !== path && !contentPath.startsWith(`${path}/`)
      )),
    ));

    const remainingTabs = openTabs.filter((openPath) => (
      openPath !== path
      && !openPath.startsWith(`${path}/`)
      && Boolean(findNode(nextFileSystem, openPath))
    ));

    if (selectedPath === path || selectedPath.startsWith(`${path}/`)) {
      const fallback = remainingTabs[0]
        ? findNode(nextFileSystem, remainingTabs[0])
        : findNode(nextFileSystem, 'src/App.tsx') ?? findFirstFile(nextFileSystem);
      const nextPath = fallback?.path ?? '';
      setOpenTabs(nextPath && !remainingTabs.includes(nextPath) ? [...remainingTabs, nextPath] : remainingTabs);
      setSelectedPath(nextPath);
      setMobileView('code');
    } else {
      setOpenTabs(remainingTabs);
    }
    setNotice(`Deleted ${path}`);
  };

  const updateContent = (path: string, value: string) => {
    setContents((current) => ({ ...current, [path]: value }));
    setNotice('Unsaved changes');
  };

  const saveFile = (path: string) => {
    if (!path) return;
    setSavedContents((current) => ({ ...current, [path]: contents[path] ?? '' }));
    setNotice(`Saved ${path}`);
  };

  const closeTab = (path: string) => {
    const tabIndex = openTabs.indexOf(path);
    const remainingTabs = openTabs.filter((openPath) => openPath !== path);
    setOpenTabs(remainingTabs);

    if (selectedPath !== path) return;

    const nextPath = remainingTabs[tabIndex] ?? remainingTabs[tabIndex - 1] ?? '';
    setSelectedPath(nextPath);
    setNotice(nextPath ? `Opened ${nextPath}` : 'No open files');
  };

  const runProject = () => {
    setTerminalOpen(true);
    void runtimeManager.current.start().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Runtime failed to start';
      setRuntime({ status: 'ERROR', error: message });
      setNotice('Runtime error');
      setTerminalLines((current) => [
        ...current,
        { id: `runtime-error-${terminalLineId.current++}`, kind: 'stderr', text: message },
      ]);
    });
  };

  const stopProject = () => {
    void runtimeManager.current.stop();
  };

  const restartProject = () => {
    setTerminalOpen(true);
    void runtimeManager.current.restart().catch((error: unknown) => {
      const message = error instanceof Error ? error.message : 'Runtime failed to restart';
      setRuntime({ status: 'ERROR', error: message });
      setNotice('Runtime error');
      setTerminalLines((current) => [
        ...current,
        { id: `runtime-error-${terminalLineId.current++}`, kind: 'stderr', text: message },
      ]);
    });
  };

  const executeTerminalCommand = async (command: string) => {
    const normalized = command.trim();
    if (!normalized) return;

    setTerminalHistory((current) => [...current, normalized]);
    setTerminalLines((current) => [
      ...current,
      { id: `command-${terminalLineId.current++}`, kind: 'command', text: normalized },
    ]);

    try {
      const result = await terminalService.current.execute(normalized);
      if (result.clear) {
        setTerminalLines([]);
        setNotice('Terminal cleared');
        return;
      }

      setTerminalLines((current) => [
        ...current,
        ...result.output.map((line) => ({
          ...line,
          id: `output-${terminalLineId.current++}`,
        })),
      ]);
      setNotice(result.exitCode === 0 ? `Completed ${normalized}` : `Command failed: ${normalized}`);
    } catch {
      setTerminalLines((current) => [
        ...current,
        {
          id: `error-${terminalLineId.current++}`,
          kind: 'stderr',
          text: 'Terminal service unavailable',
        },
      ]);
      setNotice('Terminal service unavailable');
    }
  };

  const clearTerminal = () => {
    setTerminalLines([]);
    setNotice('Terminal cleared');
  };

  const copyTerminal = () => {
    const transcript = terminalLines.map((line) => (
      line.kind === 'command' ? `$ ${line.text}` : line.text
    )).join('\n');
    void navigator.clipboard?.writeText(transcript);
    setNotice('Terminal output copied');
  };

  const resizeTerminal = (height: number) => {
    setTerminalHeight(height);
    void terminalService.current.resize({
      cols: 120,
      rows: Math.max(4, Math.floor(height / 21)),
    });
  };

  const refreshPreview = () => {
    if (runtime.status !== 'RUNNING') {
      setNotice('Start the runtime before refreshing Preview');
      return;
    }
    setPreviewKey((key) => key + 1);
    setNotice('Preview refreshed');
  };

  const openGithubWorkspace = (
    files: GithubFile[],
    repository: GithubRepository,
    branch: string,
  ) => {
    const nextContents = Object.fromEntries(files.map((file) => [file.path, file.content]));
    const nextFileSystem = buildFileSystemFromGithubFiles(files, repository.name);
    const firstFile = findFirstFile(nextFileSystem);

    setFileSystem(nextFileSystem);
    setContents(nextContents);
    setSavedContents(nextContents);
    setOpenTabs(firstFile ? [firstFile.path] : []);
    setSelectedPath(firstFile?.path ?? '');
    setMobileView('code');
    setNotice(`Loaded ${repository.fullName}@${branch}`);
  };

  return (
    <div className="codehub-shell min-h-[100dvh] text-[hsl(var(--foreground))]">
      <div className="scanline" />
      <header className="codehub-topbar relative z-10 flex h-16 items-center justify-between px-4 md:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileView('files')}
            className="mobile-only rounded-md p-2 text-[#8390a4] transition-colors hover:bg-white/[.05] hover:text-white"
            aria-label="Open files"
            data-testid="button-open-files"
          >
            <Menu size={19} />
          </button>
          <div className="brand-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" aria-label="CodeHub">
            <Code2 size={18} strokeWidth={2.5} />
          </div>
          <div className="hidden min-w-0 sm:block">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-semibold tracking-[-.02em] text-[#f0f3ee]">CodeHub</span>
              <span className="rounded border border-[#344053] px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[.12em] text-[#748195]">local</span>
            </div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#778399]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#c1e84f] status-dot" />
              The Guild / New Era
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <div className="hidden items-center gap-1 rounded-md border border-[#2a3347] bg-[#13192c] p-1 md:flex">
            <button type="button" onClick={() => setNotice('Desktop target selected')} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-[#c8d0d5] hover:bg-white/[.06]" data-testid="button-target-desktop">
              <Monitor size={14} /> Desktop
            </button>
            <button type="button" onClick={() => setNotice('Mobile target selected')} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-[#79869a] hover:bg-white/[.06]" data-testid="button-target-mobile">
              <Smartphone size={14} /> Mobile
            </button>
          </div>
          <button type="button" onClick={() => setCommandOpen((value) => !value)} className="hidden items-center gap-2 rounded-md border border-[#2a3347] bg-[#13192c] px-2.5 py-1.5 text-[#8e9bae] hover:border-[#44516a] hover:text-[#d7ddd9] md:flex" data-testid="button-command-palette">
            <Search size={14} />
            <span className="font-mono text-[10px]">⌘ K</span>
          </button>
          <div className="flex items-center gap-1 rounded-md border border-[#2a3347] bg-[#13192c] p-1">
            <button type="button" onClick={runProject} disabled={runtime.status === 'STARTING' || runtime.status === 'RUNNING'} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] font-semibold text-[#c1e84f] hover:bg-[#c1e84f]/10 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-run-project">
              <Play size={13} fill="currentColor" />
              <span className="hidden sm:inline">Run</span>
            </button>
            <button type="button" onClick={stopProject} disabled={runtime.status === 'STOPPED'} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-[#ef8374] hover:bg-[#ef8374]/10 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-stop-project">
              <Square size={12} fill="currentColor" />
              <span className="hidden sm:inline">Stop</span>
            </button>
            <button type="button" onClick={restartProject} disabled={runtime.status === 'STARTING'} className="flex items-center gap-1.5 rounded px-2 py-1.5 text-[11px] text-[#56d2df] hover:bg-[#56d2df]/10 disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-restart-project">
              <RotateCw size={13} />
              <span className="hidden sm:inline">Restart</span>
            </button>
          </div>
          <span className={`hidden rounded-full px-1.5 py-1 font-mono text-[8px] uppercase tracking-[.12em] sm:inline ${runtime.status === 'RUNNING' ? 'bg-[#c1e84f]/15 text-[#c1e84f]' : runtime.status === 'STARTING' ? 'bg-[#56d2df]/15 text-[#56d2df]' : runtime.status === 'ERROR' ? 'bg-[#ef8374]/15 text-[#ef8374]' : 'bg-[#252d40] text-[#68768c]'}`} data-testid="runtime-status">{runtime.status}</span>
           <button type="button" onClick={() => setGithubOpen(true)} className={`rounded-md border p-2 hover:border-[#536d8c] hover:text-[#d7ddd9] ${githubOpen ? 'border-[#56d2df]/60 bg-[#56d2df]/10 text-[#56d2df]' : 'border-[#2a3347] bg-[#13192c] text-[#8e9bae]'}`} aria-label="Open GitHub" data-testid="button-open-github">
             <Github size={15} />
           </button>
          <button type="button" onClick={() => { setNotice('Project link copied'); void navigator.clipboard?.writeText('codehub.local/the-guild-new-era'); }} className="rounded-md border border-[#2a3347] bg-[#13192c] p-2 text-[#8e9bae] hover:border-[#44516a] hover:text-[#d7ddd9]" aria-label="Share project" data-testid="button-share-project">
            <Share2 size={15} />
          </button>
          <button type="button" onClick={() => setNotice('Workspace settings are local-only')} className="hidden rounded-md border border-[#2a3347] bg-[#13192c] p-2 text-[#8e9bae] hover:border-[#44516a] hover:text-[#d7ddd9] md:block" aria-label="Workspace settings" data-testid="button-workspace-settings">
            <Settings2 size={15} />
          </button>
        </div>

        {commandOpen && (
          <div className="absolute right-4 top-[58px] z-30 w-[270px] rounded-lg border border-[#354159] bg-[#151b30] p-2 shadow-2xl shadow-black/30">
            <p className="px-2 pb-2 pt-1 font-mono text-[9px] uppercase tracking-[.16em] text-[#6f7d92]">Quick actions</p>
            <button type="button" onClick={() => { selectFile('src/App.tsx'); setCommandOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-[#ccd4d6] hover:bg-white/[.06]" data-testid="button-command-open-app"><FileCode2 size={14} className="text-[#c1e84f]" /> Open App.tsx <span className="ml-auto text-[10px] text-[#68758a]">↵</span></button>
             <button type="button" onClick={() => { runProject(); setCommandOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-[#ccd4d6] hover:bg-white/[.06]" data-testid="button-command-run"><Play size={14} className="text-[#c1e84f]" /> Run project <span className="ml-auto text-[10px] text-[#68758a]">⌘ R</span></button>
            <button type="button" onClick={() => { setMobileView('terminal'); setCommandOpen(false); }} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-xs text-[#ccd4d6] hover:bg-white/[.06]" data-testid="button-command-terminal"><TerminalIcon size={14} className="text-[#56d2df]" /> Focus terminal</button>
          </div>
        )}
      </header>

      <main className="workspace-grid grid h-[calc(100dvh-64px)] overflow-hidden">
        <Explorer
          tree={fileSystem}
          selectedPath={selectedPath}
          fileCount={countFiles(fileSystem)}
          onSelect={selectFile}
          onCreateFile={createFile}
          onCreateFolder={createFolder}
          onRename={renamePath}
          onDelete={deletePath}
        />

        <section
          className="workspace-main grid min-w-0 overflow-hidden border-x border-[#252d40]"
          style={{ gridTemplateRows: terminalOpen ? `minmax(0, 1fr) ${terminalHeight}px` : 'minmax(0, 1fr) 0px' }}
        >
          <div className="min-h-0 overflow-hidden">
            {mobileView === 'files' ? (
              <div className="mobile-only h-full">
                <Explorer
                  tree={fileSystem}
                  selectedPath={selectedPath}
                  fileCount={countFiles(fileSystem)}
                  onSelect={selectFile}
                  onCreateFile={createFile}
                  onCreateFolder={createFolder}
                  onRename={renamePath}
                  onDelete={deletePath}
                  mobile
                />
              </div>
            ) : mobileView === 'preview' ? (
              <div className="mobile-only h-full"><PreviewPanel runtime={runtime} previewKey={previewKey} onReload={refreshPreview} mobile /></div>
            ) : mobileView === 'terminal' ? (
              <div className="mobile-only h-full">
                <TerminalPanel
                  lines={terminalLines}
                  history={terminalHistory}
                  isRunning={runtime.status === 'RUNNING'}
                  onExecute={executeTerminalCommand}
                  onClear={clearTerminal}
                  onCopy={copyTerminal}
                />
              </div>
            ) : mobileView === 'ai' ? (
              <AiPlaceholder />
            ) : (
              <CodeEditor
                tree={fileSystem}
                openTabs={openTabs}
                activePath={selectedPath}
                contents={contents}
                savedContents={savedContents}
                notice={notice}
                onSelectTab={selectFile}
                onCloseTab={closeTab}
                onChange={updateContent}
                onSave={saveFile}
              />
            )}
          </div>
          {terminalOpen && mobileView === 'code' && (
            <TerminalPanel
              lines={terminalLines}
              history={terminalHistory}
              isRunning={runtime.status === 'RUNNING'}
              desktop
              height={terminalHeight}
              onExecute={executeTerminalCommand}
              onClear={clearTerminal}
              onCopy={copyTerminal}
              onResize={resizeTerminal}
              onClose={() => setTerminalOpen(false)}
            />
          )}
        </section>

            <PreviewPanel runtime={runtime} previewKey={previewKey} onReload={refreshPreview} />
      </main>

      <MobileNav view={mobileView} onChange={setMobileView} />
      {githubOpen && (
        <GitHubPanel
          currentContents={contents}
          onClose={() => setGithubOpen(false)}
          onOpenWorkspace={openGithubWorkspace}
        />
      )}
    </div>
  );
}

function AiPlaceholder() {
  return (
    <div className="mobile-only flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#53602d] bg-[#c1e84f]/10 text-[#c1e84f]"><Bot size={25} strokeWidth={1.5} /></div>
      <p className="mb-2 font-mono text-[9px] uppercase tracking-[.2em] text-[#c1e84f]">Future surface</p>
      <h2 className="text-xl font-semibold tracking-[-.04em] text-[#e0e6df]">AI pair is not online yet.</h2>
      <p className="mt-3 max-w-[270px] text-sm leading-relaxed text-[#718096]">CodeHub is keeping this quiet for now. The first release stays focused on the workspace.</p>
      <button type="button" disabled className="mt-6 flex items-center gap-2 rounded-md border border-[#2e394e] bg-[#182037] px-3 py-2 text-xs text-[#69768b] opacity-80" data-testid="button-ai-disabled"><Sparkles size={14} /> Coming later</button>
    </div>
  );
}

function MobileNav({ view, onChange }: { view: MobileView; onChange: (view: MobileView) => void }) {
  const items: { id: MobileView; label: string; icon: typeof Folder }[] = [
    { id: 'files', label: 'Files', icon: Folder },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'preview', label: 'Preview', icon: Globe2 },
    { id: 'terminal', label: 'Terminal', icon: TerminalIcon },
    { id: 'ai', label: 'AI', icon: Sparkles },
  ];
  return (
    <nav className="mobile-only mobile-nav fixed inset-x-0 bottom-0 z-20 flex h-[58px] items-stretch justify-around border-t border-[#2a3347] px-1 pb-[env(safe-area-inset-bottom)]" aria-label="Mobile workspace navigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button type="button" key={id} onClick={() => onChange(id)} className={`mobile-nav-item flex min-w-0 flex-1 flex-col items-center justify-center gap-1 ${view === id ? 'active' : ''} ${id === 'ai' ? 'opacity-75' : ''}`} data-testid={`nav-mobile-${id}`}>
          <Icon size={17} strokeWidth={view === id ? 2.1 : 1.7} />
          <span className="font-mono text-[9px] tracking-[.02em]">{label}{id === 'ai' && <sup className="ml-0.5 text-[7px]">soon</sup>}</span>
        </button>
      ))}
    </nav>
  );
}

function Router() {
  return (
    <ErrorBoundary resetKey={useLocation()[0]}>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;