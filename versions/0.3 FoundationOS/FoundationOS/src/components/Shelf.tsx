import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppDescriptor, ShelfEntry } from '../api/types';
import { AppCard } from './AppCard';
import { FolderWidget } from './FolderWidget';
import { FileWidget } from './FileWidget';

interface ShelfProps {
  items: ShelfEntry[];
  apps: Record<string, AppDescriptor | null>;
  reducedMotion: boolean;
  focusPath?: string | null;
  onOpenFolder: (path: string) => void;
  onOpenApp: (path: string) => void;
  onOpenFile: (path: string) => void;
  onBrowseFiles?: (path: string) => void;
}

function centre(rect: DOMRect) {
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
}

export function Shelf({ items, apps, reducedMotion, focusPath, onOpenFolder, onOpenApp, onOpenFile, onBrowseFiles }: ShelfProps) {
  const refs = useRef(new Map<string, HTMLElement>());
  const [active, setActive] = useState(0);

  const register = useCallback((element: HTMLElement | null, path: string) => {
    if (element) refs.current.set(path, element);
    else refs.current.delete(path);
  }, []);

  useEffect(() => {
    if (!focusPath) return;
    if (apps[focusPath]) return; // the app card reveals and focuses its own Open action
    const element = refs.current.get(focusPath);
    if (!element) return;
    const index = items.findIndex((item) => item.path === focusPath);
    if (index >= 0) setActive(index);
    element.focus({ preventScroll: false });
  }, [focusPath, items, apps]);

  const ordered = useCallback(
    () => items.map((item) => refs.current.get(item.path)).filter((element): element is HTMLElement => Boolean(element)),
    [items],
  );

  const move = useCallback((direction: 'left' | 'right' | 'up' | 'down' | 'home' | 'end') => {
    const elements = ordered();
    if (!elements.length) return;
    if (direction === 'home') {
      elements[0].focus();
      setActive(0);
      return;
    }
    if (direction === 'end') {
      elements[elements.length - 1].focus();
      setActive(elements.length - 1);
      return;
    }
    const itemOf = (element: HTMLElement | undefined) => element?.closest('[data-shelf-item]') ?? null;
    const activeItem = document.activeElement instanceof HTMLElement ? itemOf(document.activeElement) : null;
    let index = -1;
    items.forEach((candidateItem, candidate) => {
      if (candidateItem && itemOf(elements[candidate]) === activeItem) index = candidate;
    });
    if (index < 0) return;
    const current = centre((itemOf(elements[index]) ?? elements[index]).getBoundingClientRect());
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    elements.forEach((element, candidate) => {
      if (candidate === index) return;
      const point = centre((itemOf(element) ?? element).getBoundingClientRect());
      const dx = point.x - current.x;
      const dy = point.y - current.y;
      let inDirection = false;
      let score = 0;
      if (direction === 'left') {
        inDirection = dx < -4;
        score = -dx + Math.abs(dy) * 3;
      } else if (direction === 'right') {
        inDirection = dx > 4;
        score = dx + Math.abs(dy) * 3;
      } else if (direction === 'up') {
        inDirection = dy < -4;
        score = -dy + Math.abs(dx) * 1.6;
      } else {
        inDirection = dy > 4;
        score = dy + Math.abs(dx) * 1.6;
      }
      if (inDirection && score < bestScore) {
        bestScore = score;
        best = candidate;
      }
    });
    if (best >= 0) {
      elements[best].focus();
      setActive(best);
    }
  }, [ordered]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (!target.closest('[data-shelf-item]')) return;
    if (target.closest('[role="menu"]')) return;
    const map: Record<string, 'left' | 'right' | 'up' | 'down' | 'home' | 'end'> = {
      ArrowLeft: 'left',
      ArrowRight: 'right',
      ArrowUp: 'up',
      ArrowDown: 'down',
      Home: 'home',
      End: 'end',
    };
    const direction = map[event.key];
    if (!direction) return;
    event.preventDefault();
    move(direction);
  };

  return (
    <div className="fo-shelf" role="list" aria-label="Workspace shelf" onKeyDown={onKeyDown}>
      {items.map((item, index) => {
        if (item.type === 'folder') {
          const descriptor = apps[item.path];
          const tabIndex = index === active ? 0 : -1;
          return (
            <div role="listitem" key={item.path} style={{ display: 'contents' }}>
              {descriptor ? (
                <AppCard
                  path={item.path}
                  name={item.name}
                  descriptor={descriptor}
                  reducedMotion={reducedMotion}
                  frontTabIndex={tabIndex}
                  autoReveal={focusPath === item.path}
                  registerItem={register}
                  onOpen={() => onOpenApp(item.path)}
                  onBrowse={() => (onBrowseFiles ?? onOpenFolder)(item.path)}
                />
              ) : (
                <FolderWidget
                  path={item.path}
                  name={item.name}
                  tabIndex={tabIndex}
                  ref={(element) => register(element, item.path)}
                  onOpen={() => onOpenFolder(item.path)}
                />
              )}
            </div>
          );
        }
        return (
          <div role="listitem" key={item.path} style={{ display: 'contents' }}>
            <FileWidget
              path={item.path}
              name={item.name}
              tabIndex={index === active ? 0 : -1}
              ref={(element) => register(element, item.path)}
              onOpen={() => onOpenFile(item.path)}
            />
          </div>
        );
      })}
    </div>
  );
}
