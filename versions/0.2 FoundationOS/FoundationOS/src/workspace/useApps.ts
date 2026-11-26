import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { AppDescriptor, Entry } from '../api/types';

const cache = new Map<string, AppDescriptor | null>();
const MAX_PROBES = 12;
const CONCURRENCY = 3;

export function clearDescriptorCache() {
  cache.clear();
}

export function descriptorCacheSize() {
  return cache.size;
}

function join(base: string, name: string) {
  return base ? `${base}/${name}` : name;
}

function validate(text: string): AppDescriptor | null {
  try {
    const parsed = JSON.parse(text) as { name?: unknown; brief?: unknown };
    if (typeof parsed.name !== 'string' || !parsed.name.trim()) return null;
    const brief = typeof parsed.brief === 'string' && parsed.brief.trim() ? parsed.brief.trim() : undefined;
    return { name: parsed.name.trim(), brief };
  } catch {
    return null;
  }
}

async function probe(memberId: string, fullPath: string, signal?: AbortSignal): Promise<AppDescriptor | null> {
  const key = `${memberId}:${fullPath}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const result = await api.read(`${fullPath}/app.json`, signal ? { signal } : undefined);
    if (signal?.aborted) return null;
    if (!Array.isArray(result) && typeof result.text === 'string') {
      const descriptor = validate(result.text);
      cache.set(key, descriptor);
      return descriptor;
    }
    cache.set(key, null);
    return null;
  } catch {
    // Missing, malformed, aborted or temporarily unreadable: leave the folder
    // browsable. Aborts are never cached so a retry can probe again.
    return null;
  }
}

export function useApps(
  entries: Entry[] | null,
  memberId: string | undefined,
  basePath: string,
  priorityPath?: string | null,
) {
  const [apps, setApps] = useState<Record<string, AppDescriptor | null>>({});
  const budget = useRef<{ signature: string; probed: Set<string> }>({ signature: '', probed: new Set() });

  const folderPaths = (entries ?? [])
    .filter((entry): entry is Entry & { type: 'folder' } => entry.type === 'folder')
    .map((entry) => join(basePath, entry.name));

  const signature = folderPaths.slice(0, MAX_PROBES).join('|');

  useEffect(() => {
    if (!entries || !memberId) {
      setApps({});
      return;
    }
    if (budget.current.signature !== signature) {
      budget.current = { signature, probed: new Set() };
    }
    let cancelled = false;
    const controller = new AbortController();
    const folders = (entries ?? [])
      .filter((entry): entry is Entry & { type: 'folder' } => entry.type === 'folder')
      .map((entry) => join(basePath, entry.name));

    const chosen: string[] = [];
    if (priorityPath && folders.includes(priorityPath)) chosen.push(priorityPath);
    // Reserve the last slot of the budget so an explicitly focused or activated item can
    // still be recognised after the first probes have started.
    const viewCap = priorityPath ? MAX_PROBES : MAX_PROBES - 1;
    for (const fullPath of folders) {
      if (chosen.length >= viewCap) break;
      if (!chosen.includes(fullPath)) chosen.push(fullPath);
    }

    const next: Record<string, AppDescriptor | null> = {};
    for (const fullPath of chosen) {
      const key = `${memberId}:${fullPath}`;
      if (cache.has(key)) next[fullPath] = cache.get(key) ?? null;
    }
    setApps(next);

    let cursor = 0;
    const worker = async () => {
      while (!cancelled && cursor < chosen.length) {
        const fullPath = chosen[cursor++];
        const key = `${memberId}:${fullPath}`;
        if (cache.has(key)) continue;
        if (budget.current.probed.size >= MAX_PROBES) break;
        budget.current.probed.add(key);
        const descriptor = await probe(memberId, fullPath, controller.signal);
        if (cancelled || controller.signal.aborted) return;
        setApps((current) => ({ ...current, [fullPath]: descriptor }));
      }
    };
    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, chosen.length) }, worker));

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, memberId, priorityPath, entries, basePath]);

  return apps;
}
