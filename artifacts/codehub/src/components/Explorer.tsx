import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode2,
  FileJson2,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Layers3,
  MoreHorizontal,
  Pencil,
  Search,
  Trash2,
  X,
  Braces,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  getFileKind,
  getParentPath,
  type FileKind,
  type FileNode,
} from '@/lib/mock-file-system';

type ExplorerAction = {
  kind: 'file' | 'folder' | 'rename';
  path: string;
  initialValue: string;
};

type ExplorerProps = {
  tree: FileNode;
  selectedPath: string;
  fileCount: number;
  onSelect: (path: string) => void;
  onCreateFile: (parentPath: string, name: string) => boolean;
  onCreateFolder: (parentPath: string, name: string) => boolean;
  onRename: (path: string, name: string) => boolean;
  onDelete: (path: string) => void;
  mobile?: boolean;
};

type VisibleNode = {
  node: FileNode;
  depth: number;
};

const kindIcon = (kind: FileKind, size = 15) => {
  if (kind === 'json') return <FileJson2 size={size} strokeWidth={1.7} />;
  if (kind === 'md') return <FileText size={size} strokeWidth={1.7} />;
  if (kind === 'tsx') return <FileCode2 size={size} strokeWidth={1.7} />;
  return <Braces size={size} strokeWidth={1.7} />;
};

function hasMatchingDescendant(node: FileNode, query: string): boolean {
  return (node.children ?? []).some((child) => (
    child.name.toLowerCase().includes(query) || hasMatchingDescendant(child, query)
  ));
}

function collectVisibleNodes(
  nodes: FileNode[],
  expanded: Set<string>,
  query: string,
  depth = 0,
): VisibleNode[] {
  const visible: VisibleNode[] = [];

  for (const node of nodes) {
    const matches = !query
      || node.name.toLowerCase().includes(query)
      || (node.type === 'folder' && hasMatchingDescendant(node, query));

    if (!matches) continue;
    visible.push({ node, depth });

    if (node.type === 'folder' && (expanded.has(node.path) || Boolean(query))) {
      visible.push(...collectVisibleNodes(node.children ?? [], expanded, query, depth + 1));
    }
  }

  return visible;
}

function getTargetFolder(tree: FileNode, path: string): string {
  if (!path) return '';
  const selected = findNodeInTree(tree, path);
  return selected?.type === 'folder' ? selected.path : getParentPath(path);
}

function findNodeInTree(root: FileNode, path: string): FileNode | undefined {
  if (root.path === path) return root;
  for (const child of root.children ?? []) {
    const match = findNodeInTree(child, path);
    if (match) return match;
  }
  return undefined;
}

export default function Explorer({
  tree,
  selectedPath,
  fileCount,
  onSelect,
  onCreateFile,
  onCreateFolder,
  onRename,
  onDelete,
  mobile = false,
}: ExplorerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(['', 'src', 'src/game']),
  );
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [action, setAction] = useState<ExplorerAction | null>(null);
  const [actionError, setActionError] = useState('');

  const visibleNodes = useMemo(
    () => expanded.has('')
      ? collectVisibleNodes(tree.children ?? [], expanded, searchQuery.trim().toLowerCase())
      : [],
    [expanded, searchQuery, tree],
  );

  const toggleFolder = (path: string) => {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openAction = (kind: ExplorerAction['kind'], path: string) => {
    setActionError('');
    setAction({
      kind,
      path,
      initialValue: kind === 'rename'
        ? findNodeInTree(tree, path)?.name ?? ''
        : '',
    });
    if (kind !== 'rename') {
      setExpanded((current) => new Set(current).add(path));
    }
  };

  const submitAction = (value: string) => {
    if (!action) return;
    const success = action.kind === 'file'
      ? onCreateFile(action.path, value)
      : action.kind === 'folder'
        ? onCreateFolder(action.path, value)
        : onRename(action.path, value);

    if (success) {
      setAction(null);
      setActionError('');
    } else {
      setActionError(action.kind === 'rename' ? 'Choose a unique name.' : 'Choose a unique name for this folder.');
    }
  };

  const confirmDelete = (path: string) => {
    const node = findNodeInTree(tree, path);
    if (!node) return;
    if (window.confirm(`Delete ${node.name}?`)) {
      onDelete(path);
    }
  };

  return (
    <aside className={`${mobile ? 'flex h-full w-full' : 'hidden md:flex'} min-w-0 flex-col bg-[#11162a]`}>
      <div className="panel-header flex h-11 shrink-0 items-center justify-between border-b border-[#252d40] px-4">
        <div className="flex items-center gap-2">
          <Layers3 size={14} className="text-[#98a5b7]" />
          <span className="text-[10px] font-semibold uppercase tracking-[.16em] text-[#98a5b7]">Explorer</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSearchOpen((current) => !current)}
            className={`rounded p-1.5 ${searchOpen ? 'bg-[#c1e84f]/10 text-[#c1e84f]' : 'text-[#66738a]'} hover:bg-white/[.06] hover:text-[#d8dfda]`}
            aria-label="Search files"
            data-testid="button-search-files"
          >
            <Search size={14} />
          </button>
          <button
            type="button"
            onClick={() => openAction('file', getTargetFolder(tree, selectedPath))}
            className="rounded p-1.5 text-[#66738a] hover:bg-white/[.06] hover:text-[#d8dfda]"
            aria-label="Create file"
            data-testid="button-create-file"
          >
            <FilePlus2 size={14} />
          </button>
          <button
            type="button"
            onClick={() => openAction('folder', getTargetFolder(tree, selectedPath))}
            className="rounded p-1.5 text-[#66738a] hover:bg-white/[.06] hover:text-[#d8dfda]"
            aria-label="Create folder"
            data-testid="button-create-folder"
          >
            <FolderPlus size={14} />
          </button>
          <button
            type="button"
            onClick={() => openAction('file', '')}
            className="rounded p-1.5 text-[#66738a] hover:bg-white/[.06] hover:text-[#d8dfda]"
            aria-label="More file actions"
            data-testid="button-more-file-actions"
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {searchOpen && (
        <div className="border-b border-[#252d40] px-3 py-2">
          <label className="flex items-center gap-2 rounded border border-[#354159] bg-[#0d1325] px-2.5 py-1.5">
            <Search size={13} className="shrink-0 text-[#66738a]" />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files"
              autoFocus
              className="min-w-0 flex-1 bg-transparent font-mono text-[10px] text-[#d8dfda] outline-none placeholder:text-[#5f6c80]"
              aria-label="Search files"
              data-testid="input-search-files"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#66738a] hover:text-[#d8dfda]"
                aria-label="Clear file search"
                data-testid="button-clear-file-search"
              >
                <X size={12} />
              </button>
            )}
          </label>
        </div>
      )}

      <ContextMenu>
        <ContextMenuTrigger asChild>
          <button
            type="button"
            onClick={() => toggleFolder('')}
            className="flex w-full items-center justify-between border-b border-[#252d40]/70 px-4 py-3 text-left hover:bg-white/[.035]"
            aria-label="Project root"
            data-testid="file-row-project"
          >
            <span className="flex items-center gap-2">
              {expanded.has('') ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
              <FolderOpen size={15} className="text-[#c1e84f]" />
              <span className="font-mono text-[11px] text-[#d1d8d4]">THE GUILD</span>
            </span>
            <span className="font-mono text-[9px] text-[#657289]">{fileCount} files</span>
          </button>
        </ContextMenuTrigger>
        <ContextMenuContent className="border-[#354159] bg-[#151b30] text-[#d5dcd8]">
          <ContextMenuItem onSelect={() => openAction('file', '')}><FilePlus2 size={14} /> New file</ContextMenuItem>
          <ContextMenuItem onSelect={() => openAction('folder', '')}><FolderPlus size={14} /> New folder</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {visibleNodes.length ? visibleNodes.map(({ node, depth }) => {
          const isSelected = selectedPath === node.path;
          const isExpanded = expanded.has(node.path);

          return (
            <ContextMenu key={node.path}>
              <ContextMenuTrigger asChild>
                <button
                  type="button"
                  onClick={() => node.type === 'folder' ? toggleFolder(node.path) : onSelect(node.path)}
                  className={`file-row flex w-full items-center gap-2 py-[7px] pr-3 text-left ${isSelected ? 'selected' : 'text-[#9ba7b7]'}`}
                  style={{ paddingLeft: `${16 + depth * 17}px` }}
                  data-testid={`file-row-${node.path.replaceAll('/', '-')}`}
                >
                  {node.type === 'folder'
                    ? (isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />)
                    : <span className="w-[13px]" />}
                  {node.type === 'folder'
                    ? <Folder size={15} className={depth === 0 ? 'text-[#56d2df]' : 'text-[#7c90b2]'} />
                    : kindIcon(node.kind ?? getFileKind(node.name))}
                  <span className={`truncate font-mono text-[11px] ${isSelected ? 'font-medium' : ''}`}>{node.name}</span>
                  {node.path === 'src/App.tsx' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[#c1e84f]" />}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent className="border-[#354159] bg-[#151b30] text-[#d5dcd8]">
                {node.type === 'folder' && (
                  <>
                    <ContextMenuItem onSelect={() => openAction('file', node.path)}><FilePlus2 size={14} /> New file</ContextMenuItem>
                    <ContextMenuItem onSelect={() => openAction('folder', node.path)}><FolderPlus size={14} /> New folder</ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem onSelect={() => openAction('rename', node.path)}><Pencil size={14} /> Rename</ContextMenuItem>
                <ContextMenuItem onSelect={() => confirmDelete(node.path)} className="text-[#ef8374] focus:text-[#ef8374]"><Trash2 size={14} /> Delete</ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        }) : (
          <div className="px-5 py-8 text-center">
            <p className="font-mono text-[10px] text-[#657289]">No matching files</p>
          </div>
        )}
      </div>

      <div className="border-t border-[#252d40] px-4 py-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="font-mono text-[9px] uppercase tracking-[.15em] text-[#657289]">Source control</span>
          <GitBranch size={13} className="text-[#657289]" />
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#9ba7b7]">
          <span className="h-2.5 w-2.5 rounded-full border border-[#c1e84f] bg-[#c1e84f]/20" />
          <span>main</span>
          <span className="ml-auto font-mono text-[10px] text-[#657289]">local</span>
        </div>
      </div>

      {action && (
        <ExplorerActionDialog
          action={action}
          error={actionError}
          onCancel={() => { setAction(null); setActionError(''); }}
          onSubmit={submitAction}
        />
      )}
    </aside>
  );
}

function ExplorerActionDialog({
  action,
  error,
  onCancel,
  onSubmit,
}: {
  action: ExplorerAction;
  error: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(action.initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setValue(action.initialValue);
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [action]);

  const title = action.kind === 'rename'
    ? 'Rename item'
    : action.kind === 'file'
      ? 'Create file'
      : 'Create folder';
  const label = action.kind === 'file' ? 'File name' : action.kind === 'folder' ? 'Folder name' : 'New name';

  return (
    <div className="explorer-dialog-backdrop fixed inset-0 z-40 flex items-center justify-center px-5" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <form
        className="explorer-dialog w-full max-w-[330px] rounded-xl border border-[#354159] bg-[#151b30] p-4 shadow-2xl shadow-black/40"
        onSubmit={(event) => { event.preventDefault(); onSubmit(value); }}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#c1e84f]">Local filesystem</p>
            <h2 className="mt-1 text-sm font-semibold text-[#e0e6df]">{title}</h2>
          </div>
          <button type="button" onClick={onCancel} className="rounded p-1 text-[#718096] hover:bg-white/[.06] hover:text-[#d9dfdc]" aria-label="Close dialog">
            <X size={14} />
          </button>
        </div>
        <label className="block font-mono text-[10px] text-[#8e9bae]">
          {label}
          <input
            ref={inputRef}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="mt-2 w-full rounded-md border border-[#354159] bg-[#0e1324] px-3 py-2 text-xs text-[#d9dfdc] outline-none focus:border-[#c1e84f]/70"
            placeholder={action.kind === 'file' ? 'components/Button.tsx' : 'components'}
            autoComplete="off"
            data-testid={`input-explorer-${action.kind}`}
          />
        </label>
        {error && <p className="mt-2 text-[10px] text-[#ef8374]">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border border-[#354159] px-3 py-2 text-[11px] text-[#8e9bae] hover:bg-white/[.05]">Cancel</button>
          <button type="submit" className="rounded-md bg-[#c1e84f] px-3 py-2 text-[11px] font-semibold text-[#11162a] hover:brightness-105">Save</button>
        </div>
      </form>
    </div>
  );
}