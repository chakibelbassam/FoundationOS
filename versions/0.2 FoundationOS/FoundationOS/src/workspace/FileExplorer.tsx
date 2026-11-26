import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMediaQuery } from '@mui/material';
import { Filemanager, Willow, WillowDark } from '@svar-ui/react-filemanager';
import type { IApi } from '@svar-ui/react-filemanager';
import '@svar-ui/react-filemanager/all.css';
import { api, ApiError } from '../api/client';
import { useSession } from '../app/SessionContext';
import { usePreferences } from '../app/PreferencesContext';
import { getLastInput } from '../app/inputMode';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatePanel } from '../components/StatePanel';
import { explorerMenuOptions, fromSvarId, toSvarEntries, toSvarId } from './svarIds';
import { fromState } from './useRememberReturn';

// Unsupported even via menu or keyboard: intercepted in init so nothing runs.
const BLOCKED_ACTIONS = [
  'download-file',
  'rename-file',
  'create-file',
  'delete-files',
  'move-files',
  'copy-files',
];

type LoadError = { kind: 'not-found' | 'offline' } | null;

export function FileExplorer() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const { effective, saveError, saveState, toggleProject } = usePreferences();
  const memberId = profile?.id;
  const path = (params['*'] ?? '').replace(/\/+$/, '');
  const svarId = toSvarId(path);
  const [attempt, setAttempt] = useState(0);
  const [loadError, setLoadError] = useState<LoadError>(null);
  const apiRef = useRef<IApi | null>(null);
  const memberRef = useRef(memberId);
  const pathRef = useRef(path);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  memberRef.current = memberId;
  pathRef.current = path;

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = effective.theme === 'system' ? prefersDark : effective.theme === 'dark';
  const Theme = dark ? WillowDark : Willow;

  // A new route or member starts clean; retry bumps `attempt` and remounts.
  useEffect(() => {
    setLoadError(null);
  }, [path, memberId]);

  // Focus the heading on arrival for keyboard users; SVAR rows keep their own
  // tab order and visible focus once the explorer is mounted.
  useEffect(() => {
    if (getLastInput() === 'keyboard') headingRef.current?.focus();
    // Mount-only: browsing inside the explorer must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = useCallback(async (event: { id: string }) => {
    const requestMember = memberRef.current;
    if (!requestMember) return;
    const requestPath = fromSvarId(event.id);
    const targetId = event.id;
    try {
      const result = await api.list(requestPath);
      // A member switch during the fetch must not render stale data.
      if (memberRef.current !== requestMember) return;
      if (!Array.isArray(result)) {
        await apiRef.current?.exec('provide-data', { id: targetId, data: [] });
        return;
      }
      await apiRef.current?.exec('provide-data', {
        id: targetId,
        data: toSvarEntries(requestPath, result),
      });
      if (pathRef.current === requestPath) setLoadError(null);
    } catch (error) {
      if (memberRef.current !== requestMember) return;
      if (error instanceof ApiError && error.failure.kind === 'aborted') return;
      // An expired session is handled globally (Connect view takes over).
      if (error instanceof ApiError && error.failure.kind === 'unauthorized') return;
      // Unblock the tree with an empty listing; the banner below carries the
      // visible error and the retry, never a silent empty folder.
      try {
        await apiRef.current?.exec('provide-data', { id: targetId, data: [] });
      } catch {
        /* the banner still explains the failure */
      }
      if (pathRef.current === requestPath) {
        setLoadError({
          kind: error instanceof ApiError && error.failure.kind === 'not-found' ? 'not-found' : 'offline',
        });
      }
    }
  }, []);

  const handleInit = useCallback((service: IApi) => {
    apiRef.current = service;
    for (const action of BLOCKED_ACTIONS) {
      try {
        service.intercept(action, () => false);
      } catch {
        /* an unknown action name simply has nothing to intercept */
      }
    }
  }, []);

  const handleSetPath = useCallback(
    (event: { id: string }) => {
      const next = fromSvarId(event.id);
      if (next === pathRef.current) return;
      navigate(next ? `/files/${next}` : '/files');
    },
    [navigate],
  );

  const handleOpenFile = useCallback(
    (event: { id: string }) => {
      const target = fromSvarId(event.id);
      const dir = pathRef.current;
      navigate(`/file/${target}`, {
        state: { from: { route: dir ? `/files/${dir}` : '/files', path: dir } },
      });
    },
    [navigate],
  );

  // The panels identity only changes with the route, so in-explorer
  // navigation is never reset by a re-render.
  const panels = useMemo(() => [{ path: svarId }], [svarId]);
  const from = fromState(location.state);
  const title = path ? path.split('/').filter(Boolean).pop() ?? 'Files' : 'Files';
  const isPinned = path !== '' && (effective.projects ?? []).includes(path);
  const pinning = saveState === 'saving';

  const onTogglePin = () => {
    if (!path) return;
    void toggleProject(path);
  };

  return (
    <div className="fo-route">
      <Breadcrumbs path={path} />
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading>
        {title}
      </Typography>
      <Typography variant="body2" className="fo-page-subtitle" color="text.secondary">
        {path ? 'Folder in your private home.' : 'Your private home.'}
      </Typography>

      {path ? (
        <div className="fo-explorer-actions">
          <Button
            variant={isPinned ? 'outlined' : 'contained'}
            size="small"
            disabled={pinning}
            onClick={onTogglePin}
            aria-pressed={isPinned}
          >
            {isPinned ? 'Unpin' : 'Pin as project'}
          </Button>
          {saveState === 'error' && saveError ? (
            <Typography variant="body2" color="error" role="status">
              {saveError}
            </Typography>
          ) : null}
        </div>
      ) : null}

      {loadError ? (
        <div style={{ marginBottom: 12 }}>
          {loadError.kind === 'not-found' ? (
            <StatePanel
              title="This folder is not available"
              body="It may have been removed or renamed. Your home is still there."
              actionLabel="Go Home"
              onAction={() => navigate('/files')}
              tone="error"
            />
          ) : (
            <StatePanel
              title="The server is not reachable"
              body="Start the v0.1 FoundationOS Server or check its address, then try again."
              actionLabel="Try again"
              onAction={() => {
                setLoadError(null);
                setAttempt((value) => value + 1);
              }}
              tone="error"
            />
          )}
        </div>
      ) : null}

      <div className="fo-explorer" data-theme={dark ? 'dark' : 'light'}>
        <Theme fonts={false}>
          <Filemanager
            key={`${memberId ?? 'none'}:${attempt}`}
            data={[]}
            panels={panels}
            readonly
            icons="simple"
            menuOptions={explorerMenuOptions}
            init={handleInit}
            onRequestData={loadData}
            onSetPath={handleSetPath}
            onOpenFile={handleOpenFile}
          />
        </Theme>
      </div>
      {from ? (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
          Back returns to the previous view.
        </Typography>
      ) : null}
    </div>
  );
}
