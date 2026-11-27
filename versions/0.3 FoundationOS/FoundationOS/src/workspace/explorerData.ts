import { ApiError } from '../api/client';
import type { Entry } from '../api/types';
import { toSvarEntries, toSvarId } from './svarIds';

export interface SvarEntry {
  id: string;
  type: 'file' | 'folder';
}

// Route-folder entries for the store's `data` prop: the panel path node must
// exist in the tree or SVAR cannot resolve parents (getParents throws and
// unmounts the app). The root is built into the store, so deeper routes
// include every ancestor folder node ('/Projects' for '/Projects/Weather')
// plus the target folder with its children.
export function buildRouteData(memberPath: string, entries: Entry[]): SvarEntry[] {
  const clean = memberPath
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .join('/');
  const mapped = toSvarEntries(clean, entries);
  if (!clean) return mapped;
  const segments = clean.split('/');
  const chain: SvarEntry[] = [];
  for (let depth = 1; depth < segments.length; depth += 1) {
    chain.push({ id: `/${segments.slice(0, depth).join('/')}`, type: 'folder' });
  }
  return [...chain, { id: toSvarId(clean), type: 'folder' }, ...mapped];
}

export type ExplorerLoadResult =
  | { status: 'ok' }
  | { status: 'not-found' }
  | { status: 'offline' }
  | { status: 'skipped' };

// Loads one member folder for the SVAR explorer and feeds it to the store via
// `provide-data`. This build's SVAR does not emit `onRequestData` for the
// initial folder, so the view calls this directly on mount/route change (and
// keeps `onRequestData` for subfolders). Failures still unblock the tree with
// an empty listing; the caller shows the matching banner and retry.
export async function loadExplorerFolder(options: {
  svarId: string;
  memberPath: string;
  list: (path: string) => Promise<Entry[] | { text: string }>;
  provide: (id: string, data: SvarEntry[]) => Promise<unknown> | undefined;
}): Promise<ExplorerLoadResult> {
  const { svarId, memberPath, list, provide } = options;
  try {
    const result = await list(memberPath);
    const data = Array.isArray(result) ? toSvarEntries(memberPath, result) : [];
    try {
      await provide(svarId, data);
    } catch {
      // The listing itself succeeded; a store update failure has no banner.
    }
    return { status: 'ok' };
  } catch (error) {
    if (
      error instanceof ApiError &&
      (error.failure.kind === 'aborted' || error.failure.kind === 'unauthorized')
    ) {
      return { status: 'skipped' };
    }
    try {
      await provide(svarId, []);
    } catch {
      // The banner still explains the failure.
    }
    if (error instanceof ApiError && error.failure.kind === 'not-found') {
      return { status: 'not-found' };
    }
    return { status: 'offline' };
  }
}
