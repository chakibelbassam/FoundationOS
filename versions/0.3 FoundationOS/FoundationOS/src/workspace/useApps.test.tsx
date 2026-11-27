import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { api } from '../api/client';
import type { Entry } from '../api/types';
import { clearDescriptorCache, useApps } from './useApps';

vi.mock('../api/client', () => ({
  api: { read: vi.fn() },
}));

const mockedRead = vi.mocked(api.read);

function folder(name: string): Entry {
  return { name, type: 'folder' };
}

function descriptorResponse(name: string) {
  return { text: JSON.stringify({ name, brief: `${name} forecast` }) };
}

beforeEach(() => {
  clearDescriptorCache();
  mockedRead.mockReset();
});

describe('useApps nested descriptors', () => {
  it('probes the full member-relative path and keys results by full path', async () => {
    // Stable across renders: an inline literal would retrigger the effect.
    const entries = [folder('Weather')];
    mockedRead.mockImplementation(async (path: string) => {
      if (path === 'Projects/Weather/app.json') return descriptorResponse('Nested Weather');
      throw { failure: { kind: 'not-found' } };
    });
    const { result } = renderHook(() => useApps(entries, 'member-a', 'Projects'));
    await waitFor(() => expect(result.current['Projects/Weather']).toBeTruthy());
    expect(mockedRead).toHaveBeenCalledWith('Projects/Weather/app.json', expect.anything());
    expect(result.current['Projects/Weather']).toMatchObject({ name: 'Nested Weather' });
  });

  it('gives two nested Weather folders and a root namesake their own descriptors', async () => {
    const rootEntries = [folder('Weather')];
    const projectsEntries = [folder('Weather')];
    const archiveEntries = [folder('Weather')];
    mockedRead.mockImplementation(async (path: string) => {
      if (path === 'Weather/app.json') return descriptorResponse('Root Weather');
      if (path === 'Projects/Weather/app.json') return descriptorResponse('Projects Weather');
      if (path === 'Archive/Weather/app.json') return descriptorResponse('Archive Weather');
      throw { failure: { kind: 'not-found' } };
    });
    const root = renderHook(() => useApps(rootEntries, 'member-a', ''));
    const projects = renderHook(() => useApps(projectsEntries, 'member-a', 'Projects'));
    const archive = renderHook(() => useApps(archiveEntries, 'member-a', 'Archive'));
    await waitFor(() => expect(root.result.current.Weather).toBeTruthy());
    await waitFor(() => expect(projects.result.current['Projects/Weather']).toBeTruthy());
    await waitFor(() => expect(archive.result.current['Archive/Weather']).toBeTruthy());
    expect(root.result.current.Weather).toMatchObject({ name: 'Root Weather' });
    expect(projects.result.current['Projects/Weather']).toMatchObject({ name: 'Projects Weather' });
    expect(archive.result.current['Archive/Weather']).toMatchObject({ name: 'Archive Weather' });
    const requested = mockedRead.mock.calls.map((call) => call[0]);
    expect(requested).toContain('Weather/app.json');
    expect(requested).toContain('Projects/Weather/app.json');
    expect(requested).toContain('Archive/Weather/app.json');
  });

  it('caps probes at the 12-descriptor budget and keeps the priority slot', async () => {
    const entries = Array.from({ length: 40 }, (_, index) => folder(`Folder ${index}`));
    mockedRead.mockImplementation(async (path: string) => descriptorResponse(path));
    const { result } = renderHook(() => useApps(entries, 'member-a', '', 'Folder 39'));
    await waitFor(() => expect(result.current['Folder 39']).toBeTruthy());
    // The priority folder is probed first; the view never exceeds the budget.
    expect(mockedRead.mock.calls.length).toBeLessThanOrEqual(12);
    expect(result.current['Folder 39']).toMatchObject({ name: 'Folder 39/app.json' });
  });
});
