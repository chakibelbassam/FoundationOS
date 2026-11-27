import { describe, expect, it } from 'vitest';
import { rowSecondary } from './HomeView';

describe('home row secondary line', () => {
  it('hides the path when it equals the display name', () => {
    expect(rowSecondary('Projects', 'Projects')).toBeNull();
    expect(rowSecondary('Weather', 'Weather')).toBeNull();
  });

  it('keeps the path for nested entries', () => {
    expect(rowSecondary('Weather', 'Projects/Weather')).toBe('Projects/Weather');
    expect(rowSecondary('alpha', 'Projects/alpha')).toBe('Projects/alpha');
  });

  it('hides missing secondaries', () => {
    expect(rowSecondary('Weather', undefined)).toBeNull();
    expect(rowSecondary('Weather', '')).toBeNull();
  });
});
