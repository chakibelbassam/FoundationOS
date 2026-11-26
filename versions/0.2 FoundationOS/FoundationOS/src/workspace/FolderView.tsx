import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { Shelf } from '../components/Shelf';
import { StatePanel } from '../components/StatePanel';
import { usePreferences } from '../app/PreferencesContext';
import { getLastInput } from '../app/inputMode';
import { useSession } from '../app/SessionContext';
import type { ShelfEntry } from '../api/types';
import { useDirectory } from './useDirectory';
import { useApps } from './useApps';
import { clearResumeFocus, readResumeFocus, setResumeFocus } from './focusReturn';
import { fromState } from './useRememberReturn';

function join(base: string, name: string) {
  return base ? `${base}/${name}` : name;
}

function parentOf(path: string) {
  const parts = path.split('/').filter(Boolean);
  parts.pop();
  return parts.join('/');
}

export function FolderView() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const { effective } = usePreferences();
  const path = (params['*'] ?? '').replace(/\/+$/, '');
  const { state, reload } = useDirectory(path, profile?.id);
  const [priority, setPriority] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const from = fromState(location.state);
  const returnPath = readResumeFocus(location.state);

  const entries = state.status === 'ready' ? state.entries : null;
  const apps = useApps(entries, profile?.id, path, priority);

  const items = useMemo<ShelfEntry[]>(() => {
    if (!entries) return [];
    return entries.map((entry) =>
      entry.type === 'folder'
        ? { name: entry.name, type: 'folder' as const, path: join(path, entry.name) }
        : { name: entry.name, type: 'file' as const, path: join(path, entry.name) },
    );
  }, [entries, path]);

  const title = path ? path.split('/').filter(Boolean).pop() ?? 'Home' : 'Home';

  useEffect(() => {
    if (returnPath) return;
    if (getLastInput() === 'keyboard') {
      headingRef.current?.focus();
    }
  }, [returnPath, location.key]);

  useEffect(() => {
    if (!returnPath) return;
    const timer = window.setTimeout(() => clearResumeFocus(), 600);
    return () => window.clearTimeout(timer);
  }, [returnPath]);

  useEffect(() => {
    if (!returnPath) return;
    if (state.status !== 'ready' && state.status !== 'empty') return;
    if (state.status === 'empty' || !items.some((item) => item.path === returnPath)) {
      headingRef.current?.focus();
    }
  }, [returnPath, state.status, items]);

  const open = (kind: 'folder' | 'app' | 'file', target: string) => {
    setResumeFocus(target);
    const router = kind === 'folder' ? `/folder/${target}` : kind === 'app' ? `/app/${target}` : `/file/${target}`;
    navigate(router, { state: { from: { route: location.pathname, path: target } } });
  };

  const reducedMotion = useMemo(() => {
    if (effective.motion === 'off') return true;
    if (effective.motion === 'system') {
      return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  }, [effective.motion]);

  return (
    <div className="fo-route">
      <Breadcrumbs path={path} />
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading>
        {title}
      </Typography>
      {from ? null : (
        <Typography variant="body2" className="fo-page-subtitle" color="text.secondary">
          {path ? 'Folder in your private home.' : 'Your private home.'}
        </Typography>
      )}

      {state.status === 'loading' ? (
        <StatePanel title="Loading folder" busy />
      ) : state.status === 'empty' ? (
        <StatePanel
          title="This folder is empty"
          body="Add files from your own tools, or go back to a parent folder."
          actionLabel={path ? 'Go up' : undefined}
          onAction={path ? () => navigate(`/folder/${parentOf(path)}`) : undefined}
        />
      ) : state.status === 'not-found' ? (
        <StatePanel
          title="This folder is not available"
          body="It may have been removed or renamed. Your home is still there."
          actionLabel="Go Home"
          onAction={() => navigate('/')}
          tone="error"
        />
      ) : state.status === 'offline' ? (
        <StatePanel
          title="The server is not reachable"
          body="Start the v0.1 FoundationOS Server or check its address, then try again."
          actionLabel="Try again"
          onAction={reload}
          tone="error"
        />
      ) : state.status === 'invalid' ? (
        <StatePanel
          title="This location could not be shown"
          body={state.message}
          actionLabel="Go Home"
          onAction={() => navigate('/')}
          tone="error"
        />
      ) : (
        <div onFocusCapture={(event) => {
          const card = (event.target as HTMLElement).closest('[data-card-path]');
          const cardPath = card?.getAttribute('data-card-path');
          if (cardPath) setPriority(cardPath);
        }}>
          <Shelf
            items={items}
            apps={apps}
            reducedMotion={reducedMotion}
            focusPath={returnPath}
            onOpenFolder={(target) => open('folder', target)}
            onOpenApp={(target) => open('app', target)}
            onOpenFile={(target) => open('file', target)}
          />
          {items.length === 0 ? <p>No entries.</p> : null}
        </div>
      )}

      {path ? (
        <div className="fo-settings-actions">
          <Button variant="text" onClick={() => navigate(`/folder/${parentOf(path)}`)}>Up one folder</Button>
          <Button variant="text" onClick={() => navigate('/')}>Home</Button>
        </div>
      ) : null}
    </div>
  );
}
