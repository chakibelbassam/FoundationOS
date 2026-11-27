import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { api } from '../api/client';
import { AppsView } from './AppsView';

vi.mock('../app/SessionContext', () => ({
  useSession: () => ({ profile: { id: 'member-a', name: 'alice', role: 'member' } }),
}));

vi.mock('../app/PreferencesContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../app/PreferencesContext')>();
  return {
    ...mod,
    usePreferences: () => ({ effective: { ...mod.DEFAULT_PREFERENCES, projects: [] } }),
  };
});

vi.mock('../api/client', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../api/client')>();
  return { ...mod, api: { ...mod.api, list: vi.fn(), read: vi.fn() } };
});

const mockedList = vi.mocked(api.list);
const mockedRead = vi.mocked(api.read);

function entry(name: string, type: 'file' | 'folder' = 'folder') {
  return { name, type };
}

function renderApps(resumeFocus?: string) {
  return render(
    <MemoryRouter
      initialEntries={[{ pathname: '/apps', state: resumeFocus ? { resumeFocus } : undefined }]}
    >
      <Routes>
        <Route path="/apps" element={<AppsView />} />
        <Route path="/app/*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mockedList.mockReset();
  mockedRead.mockReset();
  mockedList.mockImplementation(async (path: string) => {
    if (path === '') return [entry('Weather')];
    throw { failure: { kind: 'not-found' } };
  });
  mockedRead.mockImplementation(async (path: string) => {
    if (path === 'Weather/app.json') return { text: JSON.stringify({ name: 'Weather' }) };
    throw { failure: { kind: 'not-found' } };
  });
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    });
  }
});

describe('return focus from an app overview (Sev-2)', () => {
  it('focuses the originating app row when Back restores /apps', async () => {
    renderApps('Weather');
    await waitFor(() => expect(screen.getByText(/folders checked\./)).not.toBeNull());
    await waitFor(() =>
      expect(document.activeElement?.getAttribute('aria-label')).toMatch(/Weather, app/),
    );
    expect(document.activeElement?.tagName).toBe('BUTTON');
  });

  it('falls back to the page heading for an unknown recorded path', async () => {
    renderApps('Vanished');
    await waitFor(() => expect(screen.getByText(/folders checked\./)).not.toBeNull());
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Apps'));
  });
});
