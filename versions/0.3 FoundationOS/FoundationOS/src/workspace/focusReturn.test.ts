import { describe, expect, it } from 'vitest';
import { clearResumeFocus, readResumeFocus, setResumeFocus } from './focusReturn';

describe('return focus on history state', () => {
  it('stores and reads the return target on the current entry', () => {
    window.history.replaceState({ usr: { from: 'x' }, key: 'k1', idx: 2 }, '');
    setResumeFocus('Weather/README.md');
    expect((window.history.state as { usr: { from: string } }).usr.from).toBe('x');
    expect(readResumeFocus({ resumeFocus: 'Weather/README.md' })).toBe('Weather/README.md');
  });

  it('clears only the return target', () => {
    window.history.replaceState({ usr: { resumeFocus: 'Weather' }, key: 'k2', idx: 3 }, '');
    clearResumeFocus();
    expect(readResumeFocus(window.history.state)).toBeNull();
  });

  it('ignores an empty or non-string value', () => {
    expect(readResumeFocus(null)).toBeNull();
    expect(readResumeFocus({ resumeFocus: '' })).toBeNull();
    expect(readResumeFocus({ resumeFocus: 4 })).toBeNull();
  });
});
