import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, motionIsReduced } from './PreferencesContext';

describe('owner-recorded preference defaults', () => {
  it('matches the recorded first-run choices', () => {
    expect(DEFAULT_PREFERENCES).toEqual({
      theme: 'system',
      surface: 'glass',
      density: 'comfortable',
      motion: 'on',
      cursor: 'target',
    });
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
