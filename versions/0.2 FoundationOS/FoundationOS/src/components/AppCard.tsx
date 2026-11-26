import { useCallback, useEffect, useRef, useState } from 'react';
import AppsIcon from '@mui/icons-material/Apps';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import type { AppDescriptor } from '../api/types';

const DWELL_MS = 1000;

export interface AppCardProps {
  path: string;
  name: string;
  descriptor: AppDescriptor;
  reducedMotion: boolean;
  frontTabIndex?: number;
  autoReveal?: boolean;
  onOpen: () => void;
  onBrowse: () => void;
  registerItem?: (element: HTMLElement | null, path: string) => void;
}

export function AppCard({ path, name, descriptor, reducedMotion, frontTabIndex = 0, autoReveal = false, onOpen, onBrowse, registerItem }: AppCardProps) {
  const [revealed, setRevealed] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const frontRef = useRef<HTMLButtonElement | null>(null);
  const runRef = useRef<HTMLButtonElement | null>(null);
  const openRef = useRef<HTMLButtonElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const dwellTimer = useRef<number | null>(null);
  const transitionTimer = useRef<number | null>(null);
  const unlockAt = useRef(0);
  const lastKeyAt = useRef(0);

  const transitionDuration = reducedMotion ? 0 : 520;

  useEffect(() => {
    registerItem?.(frontRef.current, path);
    return () => registerItem?.(null, path);
  }, [path, registerItem]);

  const clearDwell = useCallback(() => {
    if (dwellTimer.current) {
      window.clearTimeout(dwellTimer.current);
      dwellTimer.current = null;
    }
  }, []);

  const clearTransition = useCallback(() => {
    if (transitionTimer.current) {
      window.clearTimeout(transitionTimer.current);
      transitionTimer.current = null;
    }
    setTransitioning(false);
  }, []);

  useEffect(() => () => {
    clearDwell();
    clearTransition();
  }, [clearDwell, clearTransition]);

  useEffect(() => {
    if (!revealed) return;
    const onScroll = () => clearDwell();
    window.addEventListener('scroll', onScroll, { capture: true, passive: true });
    return () => window.removeEventListener('scroll', onScroll, true);
  }, [revealed, clearDwell]);

  const reveal = useCallback((source: 'pointer' | 'keyboard' | 'return') => {
    if (revealed) return;
    clearDwell();
    unlockAt.current = Date.now() + Math.max(transitionDuration, 260);
    setRevealed(true);
    setTransitioning(true);
    clearTransition();
    transitionTimer.current = window.setTimeout(() => {
      setTransitioning(false);
      transitionTimer.current = null;
      if (source === 'keyboard') runRef.current?.focus();
      if (source === 'return') openRef.current?.focus();
    }, transitionDuration);
  }, [clearDwell, clearTransition, revealed, transitionDuration]);

  useEffect(() => {
    if (!autoReveal) return;
    const timer = window.setTimeout(() => reveal('return'), 0);
    return () => window.clearTimeout(timer);
  }, [autoReveal, reveal]);

  const hide = useCallback(() => {
    setRevealed(false);
    setTransitioning(true);
    setNote(null);
    setMenuAnchor(null);
    clearTransition();
    transitionTimer.current = window.setTimeout(() => {
      setTransitioning(false);
      transitionTimer.current = null;
    }, transitionDuration);
  }, [clearTransition, transitionDuration]);

  const onPointerEnter = (event: React.PointerEvent) => {
    if (event.pointerType === 'touch' || revealed) return;
    clearDwell();
    dwellTimer.current = window.setTimeout(() => {
      dwellTimer.current = null;
      reveal('pointer');
    }, DWELL_MS);
  };

  const onPointerLeave = () => {
    clearDwell();
  };

  const onFrontClick = (event: React.MouseEvent) => {
    if (Date.now() - lastKeyAt.current < 450) return;
    if (event.detail === 0) return;
    reveal('pointer');
    lastKeyAt.current = 0;
  };

  const onFrontKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (event.repeat) return;
    lastKeyAt.current = Date.now();
    reveal('keyboard');
  };

  const onCardKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    if (menuAnchor) {
      setMenuAnchor(null);
      event.stopPropagation();
      return;
    }
    if (revealed) {
      event.stopPropagation();
      const focusWasInside = rootRef.current?.contains(document.activeElement) ?? false;
      hide();
      if (focusWasInside) window.setTimeout(() => frontRef.current?.focus(), 0);
    }
  };

  const runAction = () => {
    if (Date.now() < unlockAt.current) return;
    setNote(
      `This version opens app files. Running apps isn't available yet. Choose Open to inspect ${descriptor.name || name}.`,
    );
  };

  const displayName = descriptor.name || name;

  return (
    <div
      className="fo-card"
      ref={rootRef}
      data-revealed={revealed}
      data-target={!revealed}
      data-target-lock={transitioning}
      data-card-path={path}
      data-shelf-item
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      onKeyDown={onCardKeyDown}
    >
      <div className="fo-card-backing" aria-hidden="true" />
      <div className="fo-card-inner">
        <div className="fo-face fo-face-front" aria-hidden={revealed}>
          <button
            ref={frontRef}
            type="button"
            className="fo-card-button"
            tabIndex={revealed ? -1 : frontTabIndex}
            aria-label={`${displayName}, app. Show actions.`}
            onClick={onFrontClick}
            onKeyDown={onFrontKeyDown}
            data-target={!revealed}
          >
            <div className="fo-card-ident">
              <span className="fo-card-icon"><AppsIcon fontSize="small" /></span>
              <div>
                <div className="fo-card-name">{displayName}</div>
                <div className="fo-card-kind">App</div>
              </div>
            </div>
            {descriptor.brief ? <div className="fo-card-brief">{descriptor.brief}</div> : null}
            <div className="fo-card-spacer" />
            <div className="fo-card-hint">Hover, Enter or tap for actions</div>
          </button>
        </div>
        <div className="fo-face fo-face-back" aria-hidden={!revealed}>
          <div className="fo-card-button" style={{ cursor: 'default' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fo-card-name">{displayName}</div>
                <div className="fo-card-kind">App actions</div>
              </div>
              <button
                type="button"
                className="fo-icon-button"
                tabIndex={revealed ? 0 : -1}
                aria-label="Close app actions"
                onClick={() => {
                  hide();
                  frontRef.current?.focus();
                }}
              >
                Close
              </button>
            </div>
            <div className="fo-card-brief">
              {descriptor.brief || 'No brief is available for this app.'}
            </div>
            <div className="fo-card-spacer" />
            <div className="fo-actions" role="group" aria-label={`${displayName} actions`}>
              <button
                ref={runRef}
                type="button"
                className="fo-card-action"
                data-primary="true"
                tabIndex={revealed ? 0 : -1}
                onClick={runAction}
              >
                Run
              </button>
              <button
                ref={openRef}
                type="button"
                className="fo-card-action"
                tabIndex={revealed ? 0 : -1}
                onClick={onOpen}
              >
                Open
              </button>
              <button
                ref={moreRef}
                type="button"
                className="fo-card-action"
                tabIndex={revealed ? 0 : -1}
                aria-haspopup="menu"
                aria-expanded={Boolean(menuAnchor)}
                onClick={(event) => setMenuAnchor(event.currentTarget)}
              >
                More
              </button>
            </div>
            {note ? <div className="fo-card-note" role="status">{note}</div> : null}
          </div>
        </div>
      </div>
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => {
          setMenuAnchor(null);
          moreRef.current?.focus();
        }}
        transitionDuration={reducedMotion ? 0 : 160}
        MenuListProps={{ 'aria-label': `${displayName} more actions` }}
      >
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            onBrowse();
          }}
        >
          <ListItemIcon><FolderOpenIcon fontSize="small" /></ListItemIcon>
          Browse files
        </MenuItem>
      </Menu>
    </div>
  );
}
