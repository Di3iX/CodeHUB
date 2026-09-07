import { useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import {
  Activity,
  Archive,
  ArrowDownToLine,
  Bot,
  Braces,
  ChevronDown,
  ChevronRight,
  CircleDot,
  Code2,
  Copy,
  Download,
  FileCode2,
  FileJson2,
  FileText,
  Folder,
  FolderOpen,
  GitBranch,
  Globe2,
  Layers3,
  Menu,
  Monitor,
  MoreHorizontal,
  Play,
  RotateCw,
  Search,
  Send,
  Settings2,
  Share2,
  Smartphone,
  Sparkles,
  Square,
  Terminal as TerminalIcon,
  X,
  Zap,
} from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type MobileView = 'files' | 'code' | 'preview' | 'terminal' | 'ai';
type FileKind = 'tsx' | 'ts' | 'json' | 'md';

type ProjectFile = {
  path: string;
  name: string;
  kind: FileKind;
  depth: number;
  group?: boolean;
};

const projectFiles: ProjectFile[] = [
  { path: 'src', name: 'src', kind: 'ts', depth: 0, group: true },
  { path: 'src/App.tsx', name: 'App.tsx', kind: 'tsx', depth: 1 },
  { path: 'src/main.tsx', name: 'main.tsx', kind: 'tsx', depth: 1 },
  { path: 'src/game', name: 'game', kind: 'ts', depth: 1, group: true },
  { path: 'src/game/CityScene.ts', name: 'CityScene.ts', kind: 'ts', depth: 2 },
  { path: 'package.json', name: 'package.json', kind: 'json', depth: 0 },
  { path: 'README.md', name: 'README.md', kind: 'md', depth: 0 },
];

const initialContents: Record<string, string> = {
  'src/App.tsx': `import { CityScene } from "./game/CityScene";

export function App() {
  const scene = CityScene({ seed: "new-era" });

  return (
    <main className="guild-shell">
      <header className="guild-header">
        <span className="guild-kicker">THE GUILD</span>
        <h1>New Era</h1>
        <p>{scene.activeDistrict} is waking up.</p>
      </header>

      <section className="district-grid">
        {scene.districts.map((district) => (
          <article key={district.id}>
            <span>{district.marker}</span>
            <h2>{district.name}</h2>
            <p>{district.signal}</p>
          </article>
        ))}
      </section>
    </main>
  );
}`,
  'src/main.tsx': `import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element was not found");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);`,
  'src/game/CityScene.ts': `type District = {
  id: string;
  name: string;
  marker: string;
  signal: string;
};

export function CityScene({ seed }: { seed: string }) {
  const districts: District[] = [
    { id: "01", name: "Lantern Row", marker: "01", signal: "quiet trade" },
    { id: "02", name: "Signal Yard", marker: "02", signal: "open channel" },
    { id: "03", name: "North Gate", marker: "03", signal: "first light" },
  ];

  return {
    seed,
    activeDistrict: "Lantern Row",
    districts,
  };
}`,
  'package.json': `{
  "name": "the-guild-new-era",
  "private": true,
  "version": "0.4.2",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}`,
  'README.md': `# The Guild: New Era

A small city-builder prototype about the people who keep a
neighborhood moving after dark.

## Local development

\`\`\`sh
npm install
npm run dev
\`\`\`

The first scene is intentionally quiet. Add a district, give it
a signal, and let the city respond.`,
};

const kindIcon = (kind: FileKind, size = 15) => {
  if (kind === 'json') return <FileJson2 size={size} strokeWidth={1.7} />;
  if (kind === 'md') return <FileText size={size} strokeWidth={1.7} />;
  if (kind === 'tsx') return <FileCode2 size={size} strokeWidth={1.7} />;
  return <Braces size={size} strokeWidth={1.7} />;
};

function Home() {
  const [selectedPath, setSelectedPath] = useState('src/App.tsx');
  const [contents, setContents] = useState(initialContents);
  const [mobileView, setMobileView] = useState<MobileView>('code');
  const [isRunning, setIsRunning] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [previewKey, setPreviewKey] = useState(0);
  const [commandOpen, setCommandOpen] = useState(false);
  const [notice, setNotice] = useState('Ready');

  const selectedFile = projectFiles.find((file) => file.path === selectedPath) ?? projectFiles[1];
  const selectedContent = contents[selectedPath] ?? '';
  const lineCount = selectedContent.split('\n').length;

  const selectFile = (path: string) => {
    setSelectedPath(path);
    setMobileView('code');
    setNotice(`Opened ${path}`);
  };

  const updateContent = (value: string) => {
    setContents((current) => ({ ...current, [selectedPath]: value }));
    setNotice('Unsaved changes');
  };

  const runProject = () => {
    setIsRunning((current) => !current);
    setTerminalOpen(true);
    setNotice(isRunning ? 'Process stopped' : 'Running project');
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
          <button type="button" onClick={() => { setIsRunning(false); setNotice('Process stopped'); }} className="flex items-center gap-1.5 rounded-md border border-[#c1e84f]/35 bg-[#c1e84f] px-3 py-2 text-[11px] font-semibold text-[#131925] transition-transform hover:brightness-105 active:scale-[.98]" data-testid="button-run-project">
            {isRunning ? <Square size={13} fill="currentColor" /> : <Play size={13} fill="currentColor" />}
            <span className="hidden sm:inline">{isRunning ? 'Stop' : 'Run'}</span>
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
        <Explorer selectedPath={selectedPath} onSelect={selectFile} onNotice={setNotice} />

        <section className="workspace-main grid min-w-0 overflow-hidden border-x border-[#252d40]">
          <div className="min-h-0 overflow-hidden">
            {mobileView === 'files' ? (
              <div className="mobile-only h-full"><Explorer selectedPath={selectedPath} onSelect={selectFile} onNotice={setNotice} mobile /></div>
            ) : mobileView === 'preview' ? (
              <div className="mobile-only h-full"><PreviewPanel running={isRunning} previewKey={previewKey} onReload={() => { setPreviewKey((key) => key + 1); setNotice('Preview refreshed'); }} /></div>
            ) : mobileView === 'terminal' ? (
              <div className="mobile-only h-full"><TerminalPanel isRunning={isRunning} onClear={() => setNotice('Terminal cleared')} /></div>
            ) : mobileView === 'ai' ? (
              <AiPlaceholder />
            ) : (
              <EditorPanel file={selectedFile} content={selectedContent} lineCount={lineCount} onChange={updateContent} notice={notice} />
            )}
          </div>
          {terminalOpen && mobileView === 'code' && (
            <TerminalPanel isRunning={isRunning} onClear={() => setNotice('Terminal cleared')} desktop onClose={() => setTerminalOpen(false)} />
          )}
        </section>

        <PreviewPanel running={isRunning} previewKey={previewKey} onReload={() => { setPreviewKey((key) => key + 1); setNotice('Preview refreshed'); }} />
      </main>

      <MobileNav view={mobileView} onChange={setMobileView} />
    </div>
  );
}

function Explorer({ selectedPath, onSelect, onNotice, mobile = false }: { selectedPath: string; onSelect: (path: string) => void; onNotice: (message: string) => void; mobile?: boolean }) {
  const [srcOpen, setSrcOpen] = useState(true);
  const [gameOpen, setGameOpen] = useState(true);
  const visibleFiles = useMemo(() => projectFiles.filter((file) => {
    if (file.path.startsWith('src/game/') && !gameOpen) return false;
    if (file.path.startsWith('src/') && file.path !== 'src' && !srcOpen) return false;
    return true;
  }), [gameOpen, srcOpen]);

  return (
    <aside className={`${mobile ? 'flex h-full w-full' : 'hidden md:flex'} min-w-0 flex-col bg-[#11162a]`}>
      <div className="panel-header flex h-11 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
        <div className="flex items-center gap-2">
          <Layers3 size={14} className="text-[#98a5b7]" />
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#98a5b7]">Explorer</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button type="button" onClick={() => onNotice('Search is available from the command menu')} className="rounded p-1.5 text-[#66738a] hover:bg-white/[.06] hover:text-[#d8dfda]" aria-label="Search files" data-testid="button-search-files"><Search size={14} /></button>
          <button type="button" onClick={() => onNotice('More file actions are local-only')} className="rounded p-1.5 text-[#66738a] hover:bg-white/[.06] hover:text-[#d8dfda]" aria-label="More file actions" data-testid="button-more-file-actions"><MoreHorizontal size={14} /></button>
        </div>
      </div>
      <div className="flex items-center justify-between border-b border-[#252d40]/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <FolderOpen size={15} className="text-[#c1e84f]" />
          <span className="font-mono text-[11px] text-[#d1d8d4]">THE GUILD</span>
        </div>
        <span className="font-mono text-[9px] text-[#657289]">7 files</span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {visibleFiles.map((file) => {
          const isSelected = selectedPath === file.path;
          const isSrc = file.path === 'src';
          const isGame = file.path === 'src/game';
          return (
            <div key={file.path}>
              <button
                type="button"
                onClick={() => file.group ? (isSrc ? setSrcOpen((value) => !value) : setGameOpen((value) => !value)) : onSelect(file.path)}
                className={`file-row flex w-full items-center gap-2 py-[7px] pr-3 text-left ${isSelected ? 'selected' : 'text-[#9ba7b7]'}`}
                style={{ paddingLeft: `${16 + file.depth * 17}px` }}
                data-testid={`file-row-${file.path.replaceAll('/', '-')}`}
              >
                {file.group ? (file.path === 'src' ? (srcOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />) : (gameOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />)) : <span className="w-[13px]" />}
                {file.group ? <Folder size={15} className={file.path === 'src' ? 'text-[#56d2df]' : 'text-[#7c90b2]'} /> : kindIcon(file.kind)}
                <span className={`truncate font-mono text-[11px] ${isSelected ? 'font-medium' : ''}`}>{file.name}</span>
                {file.path === 'src/App.tsx' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c1e84f]" />}
              </button>
            </div>
          );
        })}
      </div>
      <div className="border-t border-[#252d40] px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#657289]">Source control</span>
          <GitBranch size={13} className="text-[#657289]" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#9ba7b7]">
          <CircleDot size={13} className="text-[#c1e84f]" />
          <span>main</span>
          <span className="ml-auto font-mono text-[10px] text-[#657289]">local</span>
        </div>
      </div>
    </aside>
  );
}

function EditorPanel({ file, content, lineCount, onChange, notice }: { file: ProjectFile; content: string; lineCount: number; onChange: (value: string) => void; notice: string }) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="panel-header flex h-11 shrink-0 items-center justify-between border-b border-[#252d40]">
        <div className="flex h-full items-center gap-2 border-r border-[#252d40] px-4">
          <span className="text-[#c1e84f]">{kindIcon(file.kind, 14)}</span>
          <span className="font-mono text-[11px] text-[#d5dcd8]">{file.name}</span>
          <span className="ml-1 h-1.5 w-1.5 rounded-full bg-[#c1e84f]" title="Unsaved local changes" />
        </div>
        <div className="flex items-center gap-2 px-3">
          <span className="hidden font-mono text-[9px] text-[#647187] sm:inline">{notice}</span>
          <button type="button" onClick={() => void navigator.clipboard?.writeText(content)} className="rounded p-1.5 text-[#718096] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Copy file contents" data-testid="button-copy-file"><Copy size={13} /></button>
          <button type="button" onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))} className="rounded p-1.5 text-[#718096] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Close file tab" data-testid="button-close-file"><X size={14} /></button>
        </div>
      </div>
      <div className="editor-surface flex min-h-0 flex-1 overflow-hidden">
        <div className="line-numbers w-12 shrink-0 select-none overflow-hidden pt-5 text-right font-mono text-[11px] leading-[1.75]">
          {Array.from({ length: lineCount }, (_, index) => <div key={index}>{index + 1}</div>)}
        </div>
        <textarea
          value={content}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          aria-label={`Editing ${file.path}`}
          data-testid={`textarea-editor-${file.name}`}
          className="editor-textarea min-h-full w-full overflow-auto py-5 pl-4 pr-5 font-mono text-[12px] leading-[1.75]"
        />
      </div>
      <div className="flex h-7 shrink-0 items-center justify-between border-t border-[#252d40] bg-[#10152a] px-4 font-mono text-[9px] text-[#647187]">
        <div className="flex gap-4"><span>UTF-8</span><span>LF</span><span>{file.kind === 'md' ? 'Markdown' : file.kind === 'json' ? 'JSON' : 'TypeScript JSX'}</span></div>
        <span>Ln 1, Col 1</span>
      </div>
    </div>
  );
}

function PreviewPanel({ running, previewKey, onReload }: { running: boolean; previewKey: number; onReload: () => void }) {
  return (
    <aside className="hidden min-w-0 flex-col bg-[#12182a] md:flex">
      <div className="panel-header flex h-11 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
        <div className="flex items-center gap-2">
          <Globe2 size={14} className="text-[#56d2df]" />
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#98a5b7]">Preview</span>
          <span className={`rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[.12em] ${running ? 'bg-[#c1e84f]/15 text-[#c1e84f]' : 'bg-[#252d40] text-[#68768c]'}`}>{running ? 'live' : 'idle'}</span>
        </div>
        <button type="button" onClick={onReload} className="rounded p-1.5 text-[#718096] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Refresh preview" data-testid="button-refresh-preview"><RotateCw size={14} /></button>
      </div>
      <div className="flex items-center gap-2 border-b border-[#252d40] px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded border border-[#2d374c] bg-[#0e1324] px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#c1e84f]" />
          <span className="truncate font-mono text-[10px] text-[#7e8b9d]">localhost:5173</span>
        </div>
        <button type="button" onClick={() => setPreviewNotice()} className="rounded border border-[#2d374c] p-1.5 text-[#718096] hover:bg-white/[.06]" aria-label="Open preview in new window" data-testid="button-open-preview"><ArrowDownToLine size={13} /></button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-5">
        <div key={previewKey} className="preview-window preview-frame min-h-[450px] overflow-hidden rounded-xl">
          <div className="flex items-center justify-between border-b border-[#d3d8cd] bg-[#e5e9df] px-4 py-3">
            <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#ef8374]" /><span className="h-2 w-2 rounded-full bg-[#e0bd5f]" /><span className="h-2 w-2 rounded-full bg-[#80bf79]" /></div>
            <span className="font-mono text-[9px] uppercase tracking-[.18em] text-[#76827d]">guild.local</span>
            <span className="w-10" />
          </div>
          <GuildPreview />
        </div>
      </div>
      <div className="flex items-center gap-2 border-t border-[#252d40] px-4 py-3 text-[10px] text-[#738095]">
        <Zap size={12} className={running ? 'text-[#c1e84f]' : 'text-[#536178]'} />
        <span>{running ? 'HMR connected' : 'Start the project to connect'}</span>
        <span className="ml-auto font-mono text-[9px]">1280 × 720</span>
      </div>
    </aside>
  );
}

function setPreviewNotice() {
  // Preview is intentionally local in this release; this keeps the control responsive without opening a new tab.
}

function GuildPreview() {
  return (
    <div className="px-7 py-8 sm:px-9 sm:py-10">
      <div className="mb-10 flex items-start justify-between">
        <div>
          <p className="mb-3 font-mono text-[9px] font-medium uppercase tracking-[.25em] text-[#6c7b79]">The Guild</p>
          <h2 className="font-sans text-4xl font-semibold tracking-[-.07em] text-[#263440]">New Era<span className="text-[#b0c94b]">.</span></h2>
          <p className="mt-3 max-w-[210px] text-[11px] leading-relaxed text-[#65716f]">A city is a collection of signals. Someone has to listen.</p>
        </div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border border-[#aebdb0] bg-[#f1f3ea] text-[11px] font-semibold text-[#61736d]">NG</div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="col-span-2 rounded-lg bg-[#263440] p-4 text-[#e7eadf]">
          <div className="mb-8 flex items-center justify-between"><span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#abbcaf]">Active district</span><Activity size={14} className="text-[#b9d658]" /></div>
          <p className="font-sans text-xl font-medium tracking-[-.04em]">Lantern Row</p>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-[#aebcb0]"><span className="h-1.5 w-1.5 rounded-full bg-[#bed85a]" /> Quiet trade · 04:18</div>
        </div>
        {['Signal Yard', 'North Gate'].map((name, index) => (
          <div key={name} className="rounded-lg border border-[#cad3c7] bg-[#e7ebe0]/80 p-3.5">
            <div className="mb-5 font-mono text-[9px] text-[#84918a]">0{index + 2}</div>
            <div className="text-[11px] font-medium text-[#34463f]">{name}</div>
            <div className="mt-1 text-[9px] text-[#7c8982]">{index ? 'first light' : 'open channel'}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 flex items-center justify-between border-t border-[#cad3c7] pt-4 font-mono text-[9px] text-[#83908a]"><span>3 districts online</span><span>v0.4.2</span></div>
    </div>
  );
}

function TerminalPanel({ isRunning, onClear, desktop = false, onClose }: { isRunning: boolean; onClear: () => void; desktop?: boolean; onClose?: () => void }) {
  return (
    <section className={`${desktop ? 'hidden md:flex' : 'mobile-only'} flex min-h-0 flex-col bg-[#0e1324]`}>
      <div className="panel-header flex h-10 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
        <div className="flex items-center gap-2"><TerminalIcon size={14} className="text-[#56d2df]" /><span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#98a5b7]">Terminal</span><span className="rounded bg-[#202b3f] px-1.5 py-0.5 font-mono text-[8px] text-[#718096]">zsh</span></div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onClear} className="rounded p-1.5 text-[#6c7a90] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Clear terminal" data-testid="button-clear-terminal"><Archive size={13} /></button>
          {onClose && <button type="button" onClick={onClose} className="rounded p-1.5 text-[#6c7a90] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Close terminal" data-testid="button-close-terminal"><X size={14} /></button>}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 font-mono text-[11px] leading-[1.8]">
        <div className="terminal-line"><span className="prompt">➜</span> the-guild-new-era <span className="text-[#617087]">git:(</span><span className="text-[#56d2df]">main</span><span className="text-[#617087]">)</span> npm run dev</div>
        <div className="terminal-line mt-1"><span className="info">VITE</span> v6.1.0 ready in 142 ms</div>
        <div className="terminal-line">➜  Local: <span className="info underline decoration-[#56d2df]/40 underline-offset-2">http://localhost:5173/</span></div>
        <div className="terminal-line">➜  Network: use <span className="text-[#c5ced4]">--host</span> to expose</div>
        <div className="terminal-line mt-3 border-t border-[#252d40]/70 pt-3"><span className={isRunning ? 'success' : 'text-[#718096]'}>{isRunning ? '✓' : '○'}</span> {isRunning ? 'Preview connected · waiting for changes' : 'Preview idle · press Run to start'}</div>
        <div className="terminal-line mt-3"><span className="prompt">➜</span> <span className="text-[#cbd4d5]">_</span></div>
      </div>
    </section>
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