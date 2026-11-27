import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../api/client';
import { buildRouteData, loadExplorerFolder } from './explorerData';

function entry(name: string, type: 'file' | 'folder' = 'folder') {
  return { name, type };
}

describe('route data ancestor chain (Sev-1)', () => {
  it('returns root children with no self node', () => {
    expect(buildRouteData('', [entry('Projects'), entry('Weather')])).toEqual([
      { id: '/Projects', type: 'folder' },
      { id: '/Weather', type: 'folder' },
    ]);
  });

  it('includes the target folder node for a one-level route', () => {
    expect(buildRouteData('Projects', [entry('alpha')])).toEqual([
      { id: '/Projects', type: 'folder' },
      { id: '/Projects/alpha', type: 'folder' },
    ]);
  });

  it('includes every ancestor for a two-level route so parents resolve', () => {
    expect(buildRouteData('Projects/Weather', [entry('Nested'), entry('notes.txt', 'file')])).toEqual([
      { id: '/Projects', type: 'folder' },
      { id: '/Projects/Weather', type: 'folder' },
      { id: '/Projects/Weather/Nested', type: 'folder' },
      { id: '/Projects/Weather/notes.txt', type: 'file' },
    ]);
  });
});

describe('explorer initial folder load', () => {
  it('maps the root listing to SVAR ids and provides it for /', async () => {
    const provide = vi.fn(async () => {});
    const result = await loadExplorerFolder({
      svarId: '/',
      memberPath: '',
      list: async () => [
        entry('Broken'),
        entry('Empty'),
        entry('Long-name-folder-for-a-narrow-shelf'),
        entry('Projects'),
        entry('Weather'),
        { name: 'loose-note.txt', type: 'file' },
      ],
      provide,
    });
    expect(result).toEqual({ status: 'ok' });
    expect(provide).toHaveBeenCalledWith('/', [
      { id: '/Broken', type: 'folder' },
      { id: '/Empty', type: 'folder' },
      { id: '/Long-name-folder-for-a-narrow-shelf', type: 'folder' },
      { id: '/Projects', type: 'folder' },
      { id: '/Weather', type: 'folder' },
      { id: '/loose-note.txt', type: 'file' },
    ]);
  });

  it('maps a nested folder to full member-relative ids', async () => {
    const provide = vi.fn(async () => {});
    const result = await loadExplorerFolder({
      svarId: '/Projects',
      memberPath: 'Projects',
      list: async () => [entry('Weather'), { name: 'notes.txt', type: 'file' }],
      provide,
    });
    expect(result).toEqual({ status: 'ok' });
    expect(provide).toHaveBeenCalledWith('/Projects', [
      { id: '/Projects/Weather', type: 'folder' },
      { id: '/Projects/notes.txt', type: 'file' },
    ]);
  });

  it('provides an empty listing when the path is a file', async () => {
    const provide = vi.fn(async () => {});
    const result = await loadExplorerFolder({
      svarId: '/Weather',
      memberPath: 'Weather',
      list: async () => ({ text: 'readme' }),
      provide,
    });
    expect(result).toEqual({ status: 'ok' });
    expect(provide).toHaveBeenCalledWith('/Weather', []);
  });

  it('reports missing folders and unblocks the tree', async () => {
    const provide = vi.fn(async () => {});
    const result = await loadExplorerFolder({
      svarId: '/Nope',
      memberPath: 'Nope',
      list: async () => {
        throw new ApiError({ kind: 'not-found' });
      },
      provide,
    });
    expect(result).toEqual({ status: 'not-found' });
    expect(provide).toHaveBeenCalledWith('/Nope', []);
  });

  it('reports offline failures and unblocks the tree', async () => {
    const provide = vi.fn(async () => {});
    const result = await loadExplorerFolder({
      svarId: '/Projects',
      memberPath: 'Projects',
      list: async () => {
        throw new ApiError({ kind: 'offline', message: 'Server unreachable' });
      },
      provide,
    });
    expect(result).toEqual({ status: 'offline' });
    expect(provide).toHaveBeenCalledWith('/Projects', []);
  });

  it('skips silently on abort or expired session without providing', async () => {
    for (const failure of [
      { kind: 'aborted' },
      { kind: 'unauthorized' },
    ] as const) {
      const provide = vi.fn(async () => {});
      const result = await loadExplorerFolder({
        svarId: '/',
        memberPath: '',
        list: async () => {
          throw new ApiError(failure);
        },
        provide,
      });
      expect(result, failure.kind).toEqual({ status: 'skipped' });
      expect(provide, failure.kind).not.toHaveBeenCalled();
    }
  });
});
