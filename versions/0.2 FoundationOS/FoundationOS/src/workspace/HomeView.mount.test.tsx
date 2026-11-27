import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { HomeView } from './HomeView';

vi.mock('../vendor/reactbits/MagicBento', () => ({
  default: ({ items }: { items: Array<{ content?: React.ReactNode }> }) => (
    <div data-testid="bento-stub">{items.map((item, index) => <div key={index}>{item.content}</div>)}</div>
  ),
}));

vi.mock('../app/SessionContext', () => ({
  useSession: () => ({ profile: { id: 'member-a', name: 'alice', role: 'member' } }),
}));

vi.mock('../app/PreferencesContext', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../app/PreferencesContext')>();
  return {
    ...mod,
    usePreferences: () => ({
      effective: {
        ...mod.DEFAULT_PREFERENCES,
        projects: ['Projects'],
        recentApps: ['Weather', 'Projects/Weather'],
      },
    }),
  };
});

function renderHome(resumeFocus?: string) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/', state: resumeFocus ? { resumeFocus } : undefined }]}>
      <Routes>
        <Route path="/" element={<HomeView />} />
        <Route path="/app/*" element={<div />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  if (!window.matchMedia) {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }),
    });
  }
});

describe('home return focus', () => {
  it('focuses the originating Recent row recorded before the overview', async () => {
    renderHome('Projects/Weather');
    await waitFor(() => expect(screen.getByText('Show all apps')).not.toBeNull());
    expect(document.activeElement?.textContent).toContain('Projects/Weather');
    expect(document.activeElement?.tagName).toBe('BUTTON');
  });

  it('falls back to the stored tile when no app row matches', async () => {
    window.sessionStorage.setItem('foundationos.v0.2.home-tile', 'explorer-open');
    renderHome();
    await waitFor(() => expect(screen.getByText('Show all apps')).not.toBeNull());
    expect(document.activeElement?.textContent).toContain('Open');
  });
});
