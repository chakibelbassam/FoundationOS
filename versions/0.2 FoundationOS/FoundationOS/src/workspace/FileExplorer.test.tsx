import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api/client';
import { FileExplorer } from './FileExplorer';

// Capture the SVAR props instead of mounting the real explorer: this locks in
// the view's wiring (the route folder flows through the `data` prop with a
// stable identity; subfolders still arrive through onRequestData+provide).
const seen: { props?: Record<string, unknown> } = {};
vi.mock('@svar-ui/react-filemanager', () => ({
  Filemanager: (props: Record<string, unknown>) => {
    seen.props = props;
    return <div data-testid="svar-stub" />;
  },
  Willow: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  WillowDark: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('../app/SessionContext', () => ({
  useSession: () => ({ profile: { id: 'member-a', name: 'alice', role: 'member' } }),
}));

vi.mock('../app/PreferencesContext', () => ({
  usePreferences: () => ({
    effective: { theme: 'system', projects: [] },
    saveError: null,
    saveState: 'idle',
    toggleProject: vi.fn(),
  }),
  motionIsReduced: () => false,
}));

vi.mock('../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../api/client')>();
  return { ...mod, api: { ...mod.api, list: vi.fn() } };
});

const mockedList = vi.mocked(api.list);

function entry(name: string, type: 'file' | 'folder' = 'folder') {
  return { name, type };
}

const ROOT = [
  entry('Broken'),
  entry('Empty'),
  entry('Long-name-folder-for-a-narrow-shelf'),
  entry('Projects'),
  entry('Weather'),
  entry('loose-note.txt', 'file'),
];

const ROOT_DATA = [
  { id: '/Broken', type: 'folder' },
  { id: '/Empty', type: 'folder' },
  { id: '/Long-name-folder-for-a-narrow-shelf', type: 'folder' },
  { id: '/Projects', type: 'folder' },
  { id: '/Weather', type: 'folder' },
  { id: '/loose-note.txt', type: 'file' },
];

function renderExplorer(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/files" element={<FileExplorer />} />
        <Route path="/files/*" element={<FileExplorer />} />
      </Routes>
    </MemoryRouter>,
  );
}

function latestData(): unknown {
  return (seen.props as { data?: unknown } | undefined)?.data;
}

beforeEach(() => {
  delete seen.props;
  mockedList.mockReset();
  mockedList.mockImplementation(async (path: string) => {
    if (path === '') return ROOT;
    if (path === 'Projects') return [entry('Weather'), entry('Archive')];
    if (path === 'Projects/Weather') return [entry('Nested')];
    throw { failure: { kind: 'not-found' } };
  });
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }),
    });
  }
});

describe('file explorer route data (Sev-1)', () => {
  it('passes the root listing as `data` on mount so the first render shows folders', async () => {
    renderExplorer('/files');
    expect(screen.getByTestId('svar-stub')).not.toBeNull();
    await waitFor(() => expect(mockedList).toHaveBeenCalledWith(''));
    await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
  });

  it('never provides the route folder; the `data` prop owns it', async () => {
    const exec = vi.fn(async () => {});
    renderExplorer('/files');
    const props = seen.props as unknown as { init: (service: unknown) => void };
    await act(async () => {
      props.init({ intercept: () => false, exec });
    });
    await waitFor(() => expect(mockedList).toHaveBeenCalledWith(''));
    await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
    // Init wires intercepts only; no provide-data for the route folder, so
    // the store can never receive a duplicate of the `data` rows.
    expect(exec).not.toHaveBeenCalledWith('provide-data', expect.objectContaining({ id: '/' }));
  });

  it('loads a deep link with its ancestor chain plus children', async () => {
    renderExplorer('/files/Projects');
    await waitFor(() =>
      expect(latestData()).toEqual([
        { id: '/Projects', type: 'folder' },
        { id: '/Projects/Weather', type: 'folder' },
        { id: '/Projects/Archive', type: 'folder' },
      ]),
    );
  });

  it('navigates two levels deep in the explorer without losing the chain', async () => {
    renderExplorer('/files/Projects');
    await waitFor(() =>
      expect(latestData()).toEqual([
        { id: '/Projects', type: 'folder' },
        { id: '/Projects/Weather', type: 'folder' },
        { id: '/Projects/Archive', type: 'folder' },
      ]),
    );
    // In-explorer folder open pushes the route; the new route fetches its
    // own ancestor chain so parents keep resolving.
    const props = seen.props as unknown as { onSetPath: (event: { id: string }) => void };
    await act(async () => {
      props.onSetPath({ id: '/Projects/Weather' });
    });
    await waitFor(() => expect(mockedList).toHaveBeenCalledWith('Projects/Weather'));
    await waitFor(() =>
      expect(latestData()).toEqual([
        { id: '/Projects', type: 'folder' },
        { id: '/Projects/Weather', type: 'folder' },
        { id: '/Projects/Weather/Nested', type: 'folder' },
      ]),
    );
  });

  it('loads a two-level deep link directly', async () => {
    renderExplorer('/files/Projects/Weather');
    await waitFor(() => expect(mockedList).toHaveBeenCalledWith('Projects/Weather'));
    await waitFor(() =>
      expect(latestData()).toEqual([
        { id: '/Projects', type: 'folder' },
        { id: '/Projects/Weather', type: 'folder' },
        { id: '/Projects/Weather/Nested', type: 'folder' },
      ]),
    );
  });

  it('still serves store subfolder requests through provide-data', async () => {
    const exec = vi.fn(async () => {});
    renderExplorer('/files');
    await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
    const props = seen.props as unknown as {
      init: (service: unknown) => void;
      onRequestData: (event: { id: string }) => Promise<void>;
    };
    await act(async () => {
      props.init({ intercept: () => false, exec });
    });
    await act(async () => {
      await props.onRequestData({ id: '/Projects/Weather' });
    });
    expect(mockedList).toHaveBeenCalledWith('Projects/Weather');
    await waitFor(() =>
      expect(exec).toHaveBeenCalledWith('provide-data', {
        id: '/Projects/Weather',
        data: [{ id: '/Projects/Weather/Nested', type: 'folder' }],
      }),
    );
  });

  it('shows Pin as project for /files/Projects but not at the root', async () => {
    const first = renderExplorer('/files');
    await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
    expect(screen.queryByRole('button', { name: /pin as project|unpin/i })).toBeNull();
    first.unmount();

    renderExplorer('/files/Projects');
    await waitFor(() =>
      expect(latestData()).toEqual([
        { id: '/Projects', type: 'folder' },
        { id: '/Projects/Weather', type: 'folder' },
        { id: '/Projects/Archive', type: 'folder' },
      ]),
    );
    expect(screen.getByRole('button', { name: /pin as project/i })).not.toBeNull();
  });
});
