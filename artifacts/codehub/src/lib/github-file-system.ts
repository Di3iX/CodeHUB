import { getFileKind, type FileNode } from './mock-file-system';
import type { GithubFile } from '@/services/github/types';

function ensureFolder(root: FileNode, path: string, name: string): FileNode {
  const existing = root.children?.find((child) => child.path === path);
  if (existing) return existing;

  const folder: FileNode = { path, name, type: 'folder', children: [] };
  root.children = [...(root.children ?? []), folder];
  return folder;
}

export function buildFileSystemFromGithubFiles(files: GithubFile[], rootName = 'Project'): FileNode {
  const root: FileNode = {
    path: '',
    name: rootName,
    type: 'folder',
    children: [],
  };

  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    const segments = file.path.split('/');
    const fileName = segments.pop();
    if (!fileName) continue;

    let parent = root;
    let parentPath = '';
    for (const segment of segments) {
      parentPath = parentPath ? `${parentPath}/${segment}` : segment;
      parent = ensureFolder(parent, parentPath, segment);
    }

    parent.children = [
      ...(parent.children ?? []),
      {
        path: file.path,
        name: fileName,
        type: 'file',
        kind: getFileKind(fileName),
      },
    ];
  }

  return root;
}