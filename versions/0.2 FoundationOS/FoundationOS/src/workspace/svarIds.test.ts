import { describe, expect, it } from 'vitest';
import {
  UNSUPPORTED_MENU_IDS,
  explorerMenuOptions,
  fromSvarId,
  svarIconUrl,
  toSvarEntries,
  toSvarId,
} from './svarIds';

describe('SVAR member-relative ids', () => {
  it('maps the root and nested paths both ways', () => {
    expect(toSvarId('')).toBe('/');
    expect(toSvarId('Projects')).toBe('/Projects');
    expect(toSvarId('Projects/alpha/')).toBe('/Projects/alpha');
    expect(toSvarId('/a//b/')).toBe('/a/b');
    expect(fromSvarId('/')).toBe('');
    expect(fromSvarId('/Projects')).toBe('Projects');
    expect(fromSvarId('/Projects/alpha')).toBe('Projects/alpha');
  });

  it('round-trips member paths through SVAR ids', () => {
    for (const path of ['', 'Projects', 'Projects/alpha', 'Archive/2024/notes']) {
      expect(fromSvarId(toSvarId(path))).toBe(path);
    }
  });

  it('builds item ids from the full member-relative path without fake metadata', () => {
    const items = toSvarEntries('Projects', [
      { name: 'Weather', type: 'folder' },
      { name: 'README.md', type: 'file' },
    ]);
    expect(items).toEqual([
      { id: '/Projects/Weather', type: 'folder' },
      { id: '/Projects/README.md', type: 'file' },
    ]);
    for (const item of items) {
      expect(item).not.toHaveProperty('size');
      expect(item).not.toHaveProperty('date');
    }
    expect(toSvarEntries('', [{ name: 'Weather', type: 'folder' }])).toEqual([
      { id: '/Weather', type: 'folder' },
    ]);
  });
});

describe('explorer menu filter', () => {
  const modes = ['body', 'add', 'multiselect', 'file', 'folder'] as const;

  it('exposes no unsupported operation in any menu', () => {
    for (const mode of modes) {
      const options = explorerMenuOptions(mode);
      const ids = Array.isArray(options)
        ? options.map((option) => (option && typeof option === 'object' ? String(option.id ?? option.comp) : ''))
        : [];
      for (const forbidden of UNSUPPORTED_MENU_IDS) {
        expect(ids, `mode ${mode}`).not.toContain(forbidden);
      }
    }
  });

  it('maps folders and files to the vendored vivid icons', () => {
    expect(svarIconUrl({ type: 'folder' }, 'big')).toBe('/icons/filemanager/big/folder.svg');
    expect(svarIconUrl({ type: 'folder' }, 'small')).toBe('/icons/filemanager/small/folder.svg');
    expect(svarIconUrl({ type: 'file', ext: 'md' }, 'small')).toBe('/icons/filemanager/small/md.svg');
    expect(svarIconUrl({ type: 'file', ext: 'README' }, 'big')).toBe('/icons/filemanager/big/file.svg');
    expect(svarIconUrl({ type: 'file' }, 'small')).toBe('/icons/filemanager/small/file.svg');
    expect(svarIconUrl({ type: 'multiple' }, 'big')).toBe(false);
  });

  it('drops the download affordance from the file menu in particular', () => {
    const options = explorerMenuOptions('file');
    expect(Array.isArray(options)).toBe(true);
    expect(options.some((option) => String(option.id) === 'download')).toBe(false);
  });

  it('always returns an array, never false: the AddNew toolbar calls .map on it', () => {
    for (const mode of modes) {
      const options = explorerMenuOptions(mode);
      expect(Array.isArray(options), `mode ${mode}`).toBe(true);
    }
  });
});
