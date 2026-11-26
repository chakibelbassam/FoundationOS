import { getMenuOptions } from '@svar-ui/react-filemanager';
import type { IFileMenuOption, TContextMenuType } from '@svar-ui/react-filemanager';
import type { Entry } from '../api/types';

// Member-relative POSIX ids for SVAR: '/' is the member root, '/Projects/alpha'
// a nested child. The v0.1 path is the same string without the leading slash
// ('' for the root), which is what `api.list`/`api.read` expect.
export function toSvarId(memberPath: string): string {
  const clean = memberPath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
  return clean ? `/${clean}` : '/';
}

export function fromSvarId(id: string): string {
  return id
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
}

export interface SvarItem {
  id: string;
  type: 'file' | 'folder';
}

// The v0.1 server only reports names and types, so items carry no invented
// sizes or dates: unknown metadata is omitted, never faked.
export function toSvarEntries(memberPath: string, entries: Entry[]): SvarItem[] {
  const base = toSvarId(memberPath);
  return entries.map((entry) => ({
    id: base === '/' ? `/${entry.name}` : `${base}/${entry.name}`,
    type: entry.type,
  }));
}

// v0.2 exposes no download, upload, creation, rename, deletion, copy or move.
export const UNSUPPORTED_MENU_IDS: ReadonlySet<string> = new Set([
  'download',
  'upload',
  'add-file',
  'add-folder',
  'rename',
  'delete',
  'copy',
  'move',
  'paste',
]);

// Filter the default menu factory: unsupported operations disappear from the
// body and item menus while any future supported items (preview, info) pass
// through. Returns false when nothing remains, which suppresses the menu.
export function explorerMenuOptions(mode: TContextMenuType): IFileMenuOption[] | false {
  let options: IFileMenuOption[] | false;
  try {
    options = getMenuOptions(mode);
  } catch {
    return false;
  }
  if (!Array.isArray(options)) return false;
  const kept = options.filter((option) => {
    if (!option || typeof option !== 'object') return false;
    if (option.comp === 'separator') return true;
    if (option.id === undefined || option.id === null) return true;
    return !UNSUPPORTED_MENU_IDS.has(String(option.id));
  });
  // Drop separators left orphaned at the edges or doubled up by the filter.
  const trimmed: IFileMenuOption[] = [];
  for (const option of kept) {
    const isSeparator = option.comp === 'separator';
    const previousIsSeparator = trimmed.length > 0 && trimmed[trimmed.length - 1].comp === 'separator';
    if (isSeparator && (trimmed.length === 0 || previousIsSeparator)) continue;
    trimmed.push(option);
  }
  while (trimmed.length > 0 && trimmed[trimmed.length - 1].comp === 'separator') {
    trimmed.pop();
  }
  return trimmed.length > 0 ? trimmed : false;
}
