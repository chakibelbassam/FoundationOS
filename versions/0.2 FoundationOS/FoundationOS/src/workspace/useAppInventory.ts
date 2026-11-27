import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { AppDescriptor, Entry } from '../api/types';

// Shown on /apps and the Home tile: the inventory covers the member's home
// folders and pinned projects, never a full-device search.
export const APP_INVENTORY_SCOPE =
  'Recognised apps from your home folders and pinned projects — not a full search.';
const cache = new Map<string, AppDescriptor | null>();
const MAX_TARGETS = 24;
const CONCURRENCY = 3;

export function clearInventoryCache() {
  cache.clear();
}

function isFolder(entry: Entry): entry is Entry & { type: 'folder' } {
  return entry.type === 'folder';
}

function unique(paths: string[]): string[] {
  return Array.from(new Set(paths));
}

async function listFolders(path: string, signal: AbortSignal): Promise<string[] | null> {
  try {
    const result = await api.list(path, { signal });
    if (!Array.isArray(result)) return [];
    return result.filter(isFolder).map((entry) => entry.name);
  } catch {
    return null;
  }
}

async function probe(memberId: string, fullPath: string, signal: AbortSignal): Promise<AppDescriptor | null> {
  const key = `${memberId}:${fullPath}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const result = await api.read(`${fullPath}/app.json`, { signal });
    if (signal.aborted) return null;
    if (Array.isArray(result) || typeof result.text !== 'string') {
      cache.set(key, null);
      return null;
    }
    try {
      const parsed = JSON.parse(result.text) as { name?: unknown; brief?: unknown };
      if (typeof parsed.name !== 'string' || !parsed.name.trim()) {
        cache.set(key, null);
        return null;
      }
      const brief =
        typeof parsed.brief === 'string' && parsed.brief.trim() ? parsed.brief.trim() : undefined;
      const descriptor = { name: parsed.name.trim(), brief };
      cache.set(key, descriptor);
      return descriptor;
    } catch {
      cache.set(key, null);
      return null;
    }
  } catch {
    // Missing, malformed, aborted or temporarily unreadable: aborts are never
    // cached so a retry can probe again.
    return null;
  }
}

export interface InventoryApp {
  path: string;
  descriptor: AppDescriptor;
}

export interface Inventory {
  status: 'loading' | 'ready';
  apps: InventoryApp[];
  foldersChecked: number;
}

export function useAppInventory(
  memberId: string | undefined,
  pinned: string[],
  scopeKey: string,
): Inventory {
  const [inventory, setInventory] = useState<Inventory>({ status: 'loading', apps: [], foldersChecked: 0 });
  const memberRef = useRef(memberId);
  memberRef.current = memberId;

  useEffect(() => {
    const requestMember = memberId;
    if (!requestMember) {
      setInventory({ status: 'ready', apps: [], foldersChecked: 0 });
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setInventory({ status: 'loading', apps: [], foldersChecked: 0 });
    (async () => {
      const roots = (await listFolders('', controller.signal)) ?? [];
      if (cancelled || controller.signal.aborted || memberRef.current !== requestMember) return;
      const pinnedFolders = unique(pinned.filter((entry) => entry.length > 0));
      const children: Array<string[] | null> = await Promise.all(
        pinnedFolders.map((folder) => listFolders(folder, controller.signal)),
      );
      if (cancelled || controller.signal.aborted || memberRef.current !== requestMember) return;
      const targets = unique([
        ...roots.map((name) => name),
        ...pinnedFolders,
        ...pinnedFolders.flatMap((folder, index) =>
          (children[index] ?? []).map((name) => `${folder}/${name}`),
        ),
      ]).slice(0, MAX_TARGETS);
      const found: InventoryApp[] = [];
      let cursor = 0;
      const worker = async () => {
        while (!cancelled && !controller.signal.aborted && cursor < targets.length) {
          const fullPath = targets[cursor++];
          if (memberRef.current !== requestMember) return;
          const descriptor = await probe(requestMember, fullPath, controller.signal);
          if (cancelled || controller.signal.aborted || memberRef.current !== requestMember) return;
          if (descriptor) found.push({ path: fullPath, descriptor });
        }
      };
      await Promise.all(Array.from({ length: Math.min(CONCURRENCY, targets.length) }, worker));
      if (cancelled || controller.signal.aborted || memberRef.current !== requestMember) return;
      // Discovery order: home folders first, then pinned scopes.
      const rank = (path: string) => (path.includes('/') ? 1 : 0);
      found.sort((a, b) => rank(a.path) - rank(b.path));
      setInventory({ status: 'ready', apps: found, foldersChecked: targets.length });
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberId, scopeKey]);

  return inventory;
}
