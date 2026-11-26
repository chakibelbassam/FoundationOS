import { useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import type { AppDescriptor, Entry } from '../api/types';

const cache = new Map<string, AppDescriptor | null>();
const MAX_PROBES = 12;
const CONCURRENCY = 3;

export function clearDescriptorCache() {
  cache.clear();
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

async function probe(memberId: string, path: string): Promise<AppDescriptor | null> {
  const key = `${memberId}:${path}`;
  if (cache.has(key)) return cache.get(key) ?? null;
  try {
    const result = await api.read(`${path}/app.json`);
    if (!Array.isArray(result) && typeof result.text === 'string') {
      const descriptor = validate(result.text);
      cache.set(key, descriptor);
      return descriptor;
    }
    cache.set(key, null);
    return null;
  } catch {
    // Missing, malformed or temporarily unreadable: leave the folder browsable.
    return null;
  }
}

export function useApps(entries: Entry[] | null, memberId: string | undefined, priorityPath?: string | null) {
  const [apps, setApps] = useState<Record<string, AppDescriptor | null>>({});
  const budget = useRef<{ signature: string; probed: Set<string> }>({ signature: '', probed: new Set() });

  const folderPaths = (entries ?? [])
    .filter((entry): entry is Entry & { type: 'folder' } => entry.type === 'folder')
    .map((entry) => entry.name);

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
    const folders = entries
      .filter((entry): entry is Entry & { type: 'folder' } => entry.type === 'folder')
      .map((entry) => entry.name);

    const chosen: string[] = [];
    if (priorityPath) {
      const name = priorityPath.split('/').pop();
      if (name && folders.includes(name)) chosen.push(name);
    }
    // Reserve the last slot of the budget so an explicitly focused or activated item can
    // still be recognised after the first probes have started.
    const viewCap = priorityPath ? MAX_PROBES : MAX_PROBES - 1;
    for (const name of folders) {
      if (chosen.length >= viewCap) break;
      if (!chosen.includes(name)) chosen.push(name);
    }

    const next: Record<string, AppDescriptor | null> = {};
    for (const name of chosen) {
      const key = `${memberId}:${name}`;
      if (cache.has(key)) next[name] = cache.get(key) ?? null;
    }
    setApps(next);

    let cursor = 0;
    const worker = async () => {
      while (!cancelled && cursor < chosen.length) {
        const name = chosen[cursor++];
        const key = `${memberId}:${name}`;
        if (cache.has(key)) continue;
        if (budget.current.probed.size >= MAX_PROBES) break;
        budget.current.probed.add(key);
        const descriptor = await probe(memberId, name);
        if (cancelled) return;
        setApps((current) => ({ ...current, [name]: descriptor }));
      }
    };
    void Promise.all(Array.from({ length: Math.min(CONCURRENCY, chosen.length) }, worker));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, memberId, priorityPath, entries]);

  return apps;
}
