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

  it('corrects a stuck-descending sort event into a real toggle', async () => {
    renderExplorer('/files');
    await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
    const handlers: Record<string, (event: Record<string, unknown>) => void> = {};
    const props = seen.props as unknown as { init: (service: unknown) => void };
    await act(async () => {
      props.init({
        intercept: (action: string, handler: (event: Record<string, unknown>) => void) => {
          handlers[action] = handler;
        },
        exec: vi.fn(async () => {}),
      });
    });
    expect(typeof handlers['sort-files']).toBe('function');
    // The vendored grid always recomputes "descending"; the first header
    // click keeps it, the second must flip to ascending.
    const first = { key: 'name', order: 'desc' };
    await act(async () => {
      handlers['sort-files'](first);
    });
    expect(first.order).toBe('desc');
    const second = { key: 'name', order: 'desc' };
    await act(async () => {
      handlers['sort-files'](second);
    });
    expect(second.order).toBe('asc');
    // A different column starts from the incoming order.
    const other = { key: 'size', order: 'asc' };
    await act(async () => {
      handlers['sort-files'](other);
    });
    expect(other.order).toBe('asc');
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

  it('hides the side preview on narrow containers and opens it on file select', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    try {
      renderExplorer('/files');
      await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
      // Narrow: the list is primary, so no side-by-side preview prop.
      await waitFor(() => expect((seen.props as { preview?: boolean }).preview).toBe(false));
      const exec = vi.fn(async () => {});
      const props = seen.props as unknown as {
        init: (service: unknown) => void;
        onSelectFile: (event: { id: string }) => void;
      };
      await act(async () => {
        props.init({
          intercept: () => false,
          exec,
          getFile: (id: string) => ({ id, type: id.endsWith('.txt') ? 'file' : 'folder' }),
        });
      });
      await act(async () => {
        await props.onSelectFile({ id: '/loose-note.txt' });
      });
      // Single-tap preview waits one double-click beat so a second tap can
      // still reach the reader.
      await waitFor(() => expect(exec).toHaveBeenCalledWith('show-preview', { mode: true }));
    } finally {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    }
  });

  it('sends keyboard sorts under the SVAR panel path so the toggle applies', async () => {
    renderExplorer('/files');
    await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
    const exec = vi.fn(async () => {});
    const props = seen.props as unknown as { init: (service: unknown) => void };
    await act(async () => {
      props.init({ intercept: () => false, exec });
    });
    // The real grid header lives inside .fo-explorer; a stand-in with the
    // same marker exercises the delegation wiring.
    const explorer = document.querySelector('.fo-explorer');
    expect(explorer).not.toBeNull();
    const header = document.createElement('div');
    header.setAttribute('data-header-id', ':name');
    explorer!.appendChild(header);
    try {
      header.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
      // The store keys per-panel sorts by SVAR id ('/' at the root): the
      // member path ('') would file the order where the grid never looks.
      await waitFor(() =>
        expect(exec).toHaveBeenCalledWith('sort-files', {
          key: 'name',
          order: 'desc',
          path: '/',
          panel: 0,
          corrected: true,
        }),
      );
    } finally {
      header.remove();
    }
  });

  it('offers a labelled narrow details toggle that closes and reopens', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    try {
      renderExplorer('/files');
      await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
      const exec = vi.fn(async () => {});
      let previewListener: ((event: { mode?: unknown }) => void) | null = null;
      let narrowOpen = false;
      const props = seen.props as unknown as {
        init: (service: unknown) => void;
        onSelectFile: (event: { id: string }) => void;
      };
      await act(async () => {
        props.init({
          intercept: () => false,
          exec,
          getFile: (id: string) => ({ id, type: id.endsWith('.txt') ? 'file' : 'folder' }),
          on: (action: string, handler: (event: { mode?: unknown }) => void) => {
            if (action === 'show-preview') previewListener = handler;
          },
          getState: () => ({ preview: narrowOpen }),
        });
      });
      // No selection yet: the toggle renders but stays disabled.
      expect(
        (screen.getByRole('button', { name: /file details/i }) as HTMLButtonElement).disabled,
      ).toBe(true);
      await act(async () => {
        await props.onSelectFile({ id: '/loose-note.txt' });
      });
      await waitFor(() => expect(exec).toHaveBeenCalledWith('show-preview', { mode: true }));
      // The store reports open, so the toggle offers to hide.
      narrowOpen = true;
      const hide = await screen.findByRole('button', { name: /hide file details/i });
      await act(async () => {
        hide.click();
      });
      expect(exec).toHaveBeenCalledWith('show-preview', { mode: false });
      // The preview × reports back through the subscription: the toggle
      // flips to reopen without a stale label.
      narrowOpen = false;
      await act(async () => {
        previewListener?.({ mode: false });
      });
      expect(await screen.findByRole('button', { name: /show file details/i })).not.toBeNull();
    } finally {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    }
  });

  it('clears the remembered file when a folder is selected', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    try {
      renderExplorer('/files');
      await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
      const exec = vi.fn(async () => {});
      const props = seen.props as unknown as {
        init: (service: unknown) => void;
        onSelectFile: (event: { id: string }) => void;
      };
      await act(async () => {
        props.init({
          intercept: () => false,
          exec,
          getFile: (id: string) => ({ id, type: id.endsWith('.txt') ? 'file' : 'folder' }),
        });
      });
      await act(async () => {
        await props.onSelectFile({ id: '/loose-note.txt' });
      });
      expect(await screen.findByRole('button', { name: /file details/i })).not.toBeNull();
      exec.mockClear();
      await act(async () => {
        await props.onSelectFile({ id: '/Projects' });
      });
      // Folders never open the preview; the toggle disables with no file.
      expect(exec).not.toHaveBeenCalledWith('show-preview', { mode: true });
      expect(
        (screen.getByRole('button', { name: /file details/i }) as HTMLButtonElement).disabled,
      ).toBe(true);
    } finally {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    }
  });

  it('lets a double tap reach the reader instead of the preview', async () => {
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 500 });
    try {
      renderExplorer('/files');
      await waitFor(() => expect(latestData()).toEqual(ROOT_DATA));
      const exec = vi.fn(async () => {});
      const props = seen.props as unknown as {
        init: (service: unknown) => void;
        onSelectFile: (event: { id: string }) => void;
        onOpenFile: (event: { id: string }) => void;
      };
      await act(async () => {
        props.init({
          intercept: () => false,
          exec,
          getFile: (id: string) => ({ id, type: id.endsWith('.txt') ? 'file' : 'folder' }),
        });
      });
      // First tap selects and arms the delayed preview; the double tap
      // opens the reader before the beat elapses, cancelling the takeover.
      await act(async () => {
        await props.onSelectFile({ id: '/loose-note.txt' });
        await props.onOpenFile({ id: '/loose-note.txt' });
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 450));
      });
      expect(exec).not.toHaveBeenCalledWith('show-preview', { mode: true });
    } finally {
      Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    }
  });
});
