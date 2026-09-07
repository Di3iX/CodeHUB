export type FileKind = 'tsx' | 'ts' | 'json' | 'md';

export type FileNode = {
  path: string;
  name: string;
  type: 'file' | 'folder';
  kind?: FileKind;
  children?: FileNode[];
};

export const initialFileSystem: FileNode = {
  path: '',
  name: 'Project',
  type: 'folder',
  children: [
    {
      path: 'src',
      name: 'src',
      type: 'folder',
      children: [
        {
          path: 'src/game',
          name: 'game',
          type: 'folder',
          children: [
            {
              path: 'src/game/CityScene.ts',
              name: 'CityScene.ts',
              type: 'file',
              kind: 'ts',
            },
          ],
        },
        { path: 'src/App.tsx', name: 'App.tsx', type: 'file', kind: 'tsx' },
        { path: 'src/main.tsx', name: 'main.tsx', type: 'file', kind: 'tsx' },
      ],
    },
    {
      path: 'public',
      name: 'public',
      type: 'folder',
      children: [],
    },
    { path: 'package.json', name: 'package.json', type: 'file', kind: 'json' },
    { path: 'README.md', name: 'README.md', type: 'file', kind: 'md' },
  ],
};

export const initialContents: Record<string, string> = {
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

export function getFileKind(name: string): FileKind {
  if (name.endsWith('.tsx')) return 'tsx';
  if (name.endsWith('.json')) return 'json';
  if (name.endsWith('.md')) return 'md';
  return 'ts';
}

export function findNode(root: FileNode, path: string): FileNode | undefined {
  if (root.path === path) return root;

  for (const child of root.children ?? []) {
    const match = findNode(child, path);
    if (match) return match;
  }

  return undefined;
}

export function countFiles(root: FileNode): number {
  return root.type === 'file'
    ? 1
    : (root.children ?? []).reduce((count, child) => count + countFiles(child), 0);
}

export function findFirstFile(root: FileNode): FileNode | undefined {
  if (root.type === 'file') return root;

  for (const child of root.children ?? []) {
    const match = findFirstFile(child);
    if (match) return match;
  }

  return undefined;
}

export function getParentPath(path: string): string {
  const separator = path.lastIndexOf('/');
  return separator === -1 ? '' : path.slice(0, separator);
}

export function getNodePath(parentPath: string, name: string): string {
  return parentPath ? `${parentPath}/${name}` : name;
}

export function nodeExistsInParent(
  root: FileNode,
  parentPath: string,
  name: string,
  ignoredPath?: string,
): boolean {
  const parent = findNode(root, parentPath);
  return (parent?.children ?? []).some(
    (child) => child.name.toLowerCase() === name.toLowerCase() && child.path !== ignoredPath,
  );
}

export function insertNode(
  root: FileNode,
  parentPath: string,
  node: FileNode,
): FileNode {
  if (root.path === parentPath && root.type === 'folder') {
    return { ...root, children: [...(root.children ?? []), node] };
  }

  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((child) => insertNode(child, parentPath, node)),
  };
}

export function removeNode(root: FileNode, targetPath: string): FileNode {
  if (!root.children) return root;

  return {
    ...root,
    children: root.children
      .filter((child) => child.path !== targetPath)
      .map((child) => removeNode(child, targetPath)),
  };
}

export function renameNode(
  root: FileNode,
  targetPath: string,
  nextName: string,
): FileNode {
  if (root.path === targetPath) {
    const parentPath = getParentPath(targetPath);
    const nextPath = getNodePath(parentPath, nextName);
    return updateSubtreePaths({ ...root, name: nextName }, targetPath, nextPath);
  }

  if (!root.children) return root;
  return {
    ...root,
    children: root.children.map((child) => renameNode(child, targetPath, nextName)),
  };
}

function updateSubtreePaths(node: FileNode, previousPath: string, nextPath: string): FileNode {
  const path = node.path === previousPath
    ? nextPath
    : `${nextPath}${node.path.slice(previousPath.length)}`;

  return {
    ...node,
    path,
    children: node.children?.map((child) => updateSubtreePaths(child, previousPath, nextPath)),
  };
}

export function updateContentPaths(
  contents: Record<string, string>,
  previousPath: string,
  nextPath: string,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(contents).map(([path, content]) => {
      if (path !== previousPath && !path.startsWith(`${previousPath}/`)) {
        return [path, content];
      }

      return [`${nextPath}${path.slice(previousPath.length)}`, content];
    }),
  );
}