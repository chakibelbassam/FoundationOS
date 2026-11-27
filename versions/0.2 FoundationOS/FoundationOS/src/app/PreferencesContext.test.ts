import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  MAX_PINNED_PROJECTS,
  MAX_RECENT_APPS,
  isMemberPath,
  motionIsReduced,
  recordAppInList,
  toggleProjectInList,
} from './PreferencesContext';

describe('owner-recorded preference defaults', () => {
  it('matches the recorded first-run choices', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: 'system',
      surface: 'glass',
      density: 'comfortable',
      motion: 'on',
      cursor: 'target',
      background: 'topography',
      projects: [],
      recentApps: [],
    });
  });

  it('defaults missing keys so older saved settings stay readable', () => {
    const stored = { theme: 'dark', surface: 'glass', density: 'compact', motion: 'off', cursor: 'target' };
    expect({ ...DEFAULT_PREFERENCES, ...stored }).toEqual({ ...stored, background: 'topography', projects: [], recentApps: [] });
  });

  it('keeps motion on when Windows requests reduced motion, unless the member chooses otherwise', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    expect(motionIsReduced('on')).toBe(false);
    expect(motionIsReduced('off')).toBe(true);
    expect(motionIsReduced('system')).toBe(true);
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });
});

describe('pinned projects and recent apps', () => {
  it('pins and unpins member-relative folders', () => {
    expect(toggleProjectInList([], 'Projects/alpha')).toEqual({ projects: ['Projects/alpha'] });
    expect(toggleProjectInList(['Projects/alpha'], 'Projects/alpha')).toEqual({ projects: [] });
  });

  it('refuses to pin beyond the cap or outside the member root', () => {
    const full = Array.from({ length: MAX_PINNED_PROJECTS }, (_, index) => `Folder ${index}`);
    const outcome = toggleProjectInList(full, 'One more');
    expect('error' in outcome && outcome.error.length > 0).toBe(true);
    expect(toggleProjectInList([], '../escape')).toEqual({ error: expect.any(String) });
    expect(toggleProjectInList([], '/absolute')).toEqual({ error: expect.any(String) });
  });

  it('records recency newest-first, de-duplicated and capped', () => {
    expect(recordAppInList([], 'Weather')).toEqual(['Weather']);
    expect(recordAppInList(['Projects/Weather', 'Weather'], 'Weather')).toEqual([
      'Weather',
      'Projects/Weather',
    ]);
    const full = Array.from({ length: MAX_RECENT_APPS }, (_, index) => `App ${index}`);
    expect(recordAppInList(full, 'New app')).toEqual(['New app', ...full.slice(0, MAX_RECENT_APPS - 1)]);
    expect(recordAppInList(['Weather'], '../escape')).toEqual(['Weather']);
  });

  it('validates member-relative paths like the host', () => {
    expect(isMemberPath('Projects/alpha')).toBe(true);
    expect(isMemberPath('a b/c_d-e.f')).toBe(true);
    for (const bad of ['', '/absolute', 'trailing/', '..', 'a/../../b', 'back\\slash', 'a//b']) {
      expect(isMemberPath(bad), JSON.stringify(bad)).toBe(false);
    }
  });
});
