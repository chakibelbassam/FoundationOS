import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../api/client';
import type { Entry } from '../api/types';
import { clearInventoryCache, useAppInventory } from './useAppInventory';

vi.mock('../api/client', () => ({
  api: { list: vi.fn(), read: vi.fn() },
}));

const mockedList = vi.mocked(api.list);
const mockedRead = vi.mocked(api.read);

function folder(name: string): Entry {
  return { name, type: 'folder' };
}

function file(name: string): Entry {
  return { name, type: 'file' };
}

beforeEach(() => {
  clearInventoryCache();
  mockedList.mockReset();
  mockedRead.mockReset();
});

describe('workspace app inventory', () => {
  it('probes the member root folders plus each pinned project folder', async () => {
    const rootEntries = [folder('Weather'), folder('Projects'), file('README.md')];
    const projectsEntries = [folder('Weather'), file('notes.txt')];
    mockedList.mockImplementation(async (path: string) => {
      if (path === '') return rootEntries;
      if (path === 'Projects') return projectsEntries;
      throw { failure: { kind: 'not-found' } };
    });
    mockedRead.mockImplementation(async (path: string) => {
      if (path === 'Weather/app.json') return { text: JSON.stringify({ name: 'Root Weather' }) };
      if (path === 'Projects/app.json') return { text: JSON.stringify({ name: 'Projects hub' }) };
      if (path === 'Projects/Weather/app.json') return { text: JSON.stringify({ name: 'Nested Weather' }) };
      throw { failure: { kind: 'not-found' } };
    });
    const pinned = ['Projects'];
    const { result } = renderHook(() => useAppInventory('member-a', pinned, pinned.join('|')));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    const paths = result.current.apps.map((app) => app.path);
    expect(paths).toContain('Weather');
    expect(paths).toContain('Projects');
    expect(paths).toContain('Projects/Weather');
    expect(result.current.apps.find((app) => app.path === 'Projects/Weather')?.descriptor).toMatchObject({
      name: 'Nested Weather',
    });
    // Root, the pinned folder itself, and the pinned child: three folders checked.
    expect(result.current.foldersChecked).toBe(3);
    const requested = mockedRead.mock.calls.map((call) => call[0]);
    expect(requested).toContain('Weather/app.json');
    expect(requested).toContain('Projects/app.json');
    expect(requested).toContain('Projects/Weather/app.json');
  });

  it('caps probes at 24 with three concurrent workers', async () => {
    const rootEntries = Array.from({ length: 40 }, (_, index) => folder(`Folder ${index}`));
    mockedList.mockImplementation(async () => rootEntries);
    mockedRead.mockImplementation(async (path: string) => ({ text: JSON.stringify({ name: path }) }));
    const { result } = renderHook(() => useAppInventory('member-a', [], ''));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(mockedRead.mock.calls.length).toBeLessThanOrEqual(24);
    expect(result.current.foldersChecked).toBeLessThanOrEqual(24);
    expect(result.current.apps.length).toBeLessThanOrEqual(24);
  });

  it('isolates the cache per member', async () => {
    mockedList.mockImplementation(async () => [folder('Weather')]);
    mockedRead.mockImplementation(async (path: string) => {
      if (path === 'Weather/app.json') return { text: JSON.stringify({ name: 'Shared name' }) };
      throw { failure: { kind: 'not-found' } };
    });
    const first = renderHook(() => useAppInventory('member-a', [], ''));
    await waitFor(() => expect(first.result.current.status).toBe('ready'));
    expect(first.result.current.apps).toHaveLength(1);
    mockedRead.mockClear();
    const second = renderHook(() => useAppInventory('member-b', [], ''));
    await waitFor(() => expect(second.result.current.status).toBe('ready'));
    // A different member key probes again instead of reading member-a's cache.
    expect(mockedRead.mock.calls.length).toBeGreaterThan(0);
    expect(second.result.current.apps).toHaveLength(1);
  });
});
