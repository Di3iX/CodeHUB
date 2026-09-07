import Editor, { type OnMount } from '@monaco-editor/react';
import { Copy, FileCode2, FileJson2, FileText, Save, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import {
  findNode,
  getFileKind,
  type FileNode,
} from '@/lib/mock-file-system';

type CodeEditorProps = {
  tree: FileNode;
  openTabs: string[];
  activePath: string;
  contents: Record<string, string>;
  savedContents: Record<string, string>;
  notice: string;
  onSelectTab: (path: string) => void;
  onCloseTab: (path: string) => void;
  onChange: (path: string, value: string) => void;
  onSave: (path: string) => void;
};

function getMonacoLanguage(name: string) {
  const kind = getFileKind(name);
  if (kind === 'tsx') return 'typescriptreact';
  if (kind === 'ts') return 'typescript';
  if (kind === 'jsx') return 'javascript';
  if (kind === 'js') return 'javascript';
  if (kind === 'json') return 'json';
  if (kind === 'css') return 'css';
  if (kind === 'html') return 'html';
  return 'markdown';
}

function getLanguageLabel(name: string) {
  const language = getMonacoLanguage(name);
  if (language === 'typescript' || language === 'typescriptreact') return 'TypeScript';
  if (language === 'javascript') return 'JavaScript';
  if (language === 'json') return 'JSON';
  if (language === 'css') return 'CSS';
  if (language === 'html') return 'HTML';
  return 'Markdown';
}

function fileIcon(file: FileNode) {
  const kind = file.kind ?? getFileKind(file.name);
  if (kind === 'json') return <FileJson2 size={13} strokeWidth={1.8} />;
  if (kind === 'md') return <FileText size={13} strokeWidth={1.8} />;
  return <FileCode2 size={13} strokeWidth={1.8} />;
}

export default function CodeEditor({
  tree,
  openTabs,
  activePath,
  contents,
  savedContents,
  notice,
  onSelectTab,
  onCloseTab,
  onChange,
  onSave,
}: CodeEditorProps) {
  const tabs = useMemo(
    () => openTabs
      .map((path) => findNode(tree, path))
      .filter((node): node is FileNode => Boolean(node && node.type === 'file')),
    [openTabs, tree],
  );
  const activeFile = findNode(tree, activePath);
  const activeContent = activeFile ? contents[activeFile.path] ?? '' : '';
  const activeLanguage = activeFile ? getMonacoLanguage(activeFile.name) : 'plaintext';
  const activeIsDirty = activeFile
    ? activeContent !== (savedContents[activeFile.path] ?? '')
    : false;

  useEffect(() => {
    const handleSaveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (activeFile) onSave(activeFile.path);
      }
    };

    window.addEventListener('keydown', handleSaveShortcut);
    return () => window.removeEventListener('keydown', handleSaveShortcut);
  }, [activeFile, onSave]);

  const handleEditorMount: OnMount = (editor, monaco) => {
    if (!activeFile) return;

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    editor.addAction({
      id: 'codehub.save-file',
      label: 'Save File',
      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS],
      run: () => {
        onSave(activeFile.path);
      },
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="panel-header flex min-h-11 shrink-0 items-stretch border-b border-[#252d40]">
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = tab.path === activePath;
            const isDirty = (contents[tab.path] ?? '') !== (savedContents[tab.path] ?? '');

            return (
              <div
                key={tab.path}
                className={`group flex min-w-[132px] max-w-[210px] items-center border-r border-[#252d40] ${isActive ? 'bg-[#161d34]' : 'bg-transparent'}`}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.path)}
                  className={`flex min-w-0 flex-1 items-center gap-2 px-3 text-left text-[11px] ${isActive ? 'text-[#dce4de]' : 'text-[#78869b] hover:text-[#c8d1d1]'}`}
                  aria-label={`Open ${tab.path}`}
                  data-testid={`tab-file-${tab.name}`}
                >
                  <span className={isActive ? 'text-[#c1e84f]' : 'text-[#67748a]'}>{fileIcon(tab)}</span>
                  <span className="min-w-0 truncate font-mono">{tab.name}</span>
                  {isDirty && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#c1e84f]" title="Unsaved changes" />}
                </button>
                <button
                  type="button"
                  onClick={() => onCloseTab(tab.path)}
                  className="mr-1 rounded p-1 text-[#617087] opacity-70 hover:bg-white/[.08] hover:text-[#dce4de] group-hover:opacity-100"
                  aria-label={`Close ${tab.name}`}
                  data-testid={`button-close-tab-${tab.name}`}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })}
          {tabs.length === 0 && (
            <div className="flex items-center px-4 font-mono text-[10px] text-[#65738a]">No open files</div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 border-l border-[#252d40] px-2">
          <span className="hidden max-w-[140px] truncate px-2 font-mono text-[9px] text-[#647187] lg:inline">{notice}</span>
          <button
            type="button"
            onClick={() => activeFile && onSave(activeFile.path)}
            disabled={!activeFile || !activeIsDirty}
            className="flex items-center gap-1.5 rounded-md border border-[#c1e84f]/30 px-2 py-1.5 text-[10px] font-semibold text-[#c1e84f] transition-colors hover:bg-[#c1e84f]/10 disabled:cursor-not-allowed disabled:border-[#2a3347] disabled:text-[#58657b]"
            aria-label="Save file"
            data-testid="button-save-file"
          >
            <Save size={13} />
            <span>Save</span>
          </button>
          <button
            type="button"
            onClick={() => activeFile && void navigator.clipboard?.writeText(activeContent)}
            disabled={!activeFile}
            className="rounded p-1.5 text-[#718096] hover:bg-white/[.06] hover:text-[#d9dfdc] disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Copy file contents"
            data-testid="button-copy-file"
          >
            <Copy size={13} />
          </button>
        </div>
      </div>

      <div className="editor-surface min-h-0 flex-1 overflow-hidden">
        {activeFile ? (
          <Editor
            key={activeFile.path}
            height="100%"
            language={activeLanguage}
            theme="vs-dark"
            value={activeContent}
            onChange={(value) => onChange(activeFile.path, value ?? '')}
            onMount={handleEditorMount}
            loading={<div className="p-5 font-mono text-[11px] text-[#647187]">Loading Monaco…</div>}
            options={{
              automaticLayout: true,
              bracketPairColorization: { enabled: true },
              cursorBlinking: 'smooth',
              fontFamily: "'DM Mono', ui-monospace, SFMono-Regular, monospace",
              fontSize: 12,
              lineHeight: 21,
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              minimap: { enabled: false },
              padding: { top: 18, bottom: 18 },
              renderLineHighlight: 'gutter',
              renderWhitespace: 'selection',
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              tabSize: 2,
              wordWrap: 'off',
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-center">
            <div>
              <FileCode2 size={28} className="mx-auto mb-3 text-[#536178]" strokeWidth={1.3} />
              <p className="font-mono text-[11px] text-[#8390a4]">Select a file from Explorer to start editing.</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex h-7 shrink-0 items-center justify-between border-t border-[#252d40] bg-[#10152a] px-4 font-mono text-[9px] text-[#647187]">
        <div className="flex gap-4">
          <span>UTF-8</span>
          <span>LF</span>
          <span>{activeFile ? getLanguageLabel(activeFile.name) : 'Plain Text'}</span>
        </div>
        <span>{activeFile ? 'Ln 1, Col 1' : 'No file'}</span>
      </div>
    </div>
  );
}