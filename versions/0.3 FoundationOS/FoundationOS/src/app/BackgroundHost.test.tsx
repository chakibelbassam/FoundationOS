import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BackgroundHost, checkWebGL, resolveBackgroundEffect } from './BackgroundHost';

beforeEach(() => {
  // jsdom has no canvas implementation; report no context without noise.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('background fallback decision', () => {
  it('renders the member effect when motion is on and WebGL is available', () => {
    for (const background of ['topography', 'magic-rings', 'lightfall', 'ghost-fibers'] as const) {
      expect(resolveBackgroundEffect(background, { reducedMotion: false, webgl: true })).toBe(background);
    }
  });

  it('falls back to the static backdrop without motion or WebGL', () => {
    expect(resolveBackgroundEffect('topography', { reducedMotion: true, webgl: true })).toBe('standard');
    expect(resolveBackgroundEffect('lightfall', { reducedMotion: false, webgl: false })).toBe('standard');
    expect(resolveBackgroundEffect('ghost-fibers', { reducedMotion: true, webgl: false })).toBe('standard');
  });

  it('keeps Standard static even with full support', () => {
    expect(resolveBackgroundEffect('standard', { reducedMotion: false, webgl: true })).toBe('standard');
  });

  it('reports no WebGL in this jsdom run and renders the static backdrop', () => {
    expect(checkWebGL()).toBe(false);
    const { container, unmount } = render(
      <BackgroundHost background="topography" reducedMotion={false} dark={false} />,
    );
    expect(container.querySelector('.fo-backdrop-static')).not.toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    // Cleanup where practical: unmounting removes the fallback cleanly.
    unmount();
    expect(container.innerHTML).toBe('');
    expect(screen.queryByText(/Topography/)).toBeNull();
  });
});
