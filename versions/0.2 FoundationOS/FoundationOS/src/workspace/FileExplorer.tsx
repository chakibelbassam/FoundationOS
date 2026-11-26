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
import { buildRouteData, loadExplorerFolder } from './explorerData';
import type { SvarEntry } from './explorerData';
import { explorerMenuOptions, fromSvarId, toSvarId } from './svarIds';
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
  // The current route folder's entries, passed as the store's `data` prop.
  // Identity changes only when the fetched content changes: this is the
  // deterministic first render. (An inline `data={[]}` got a fresh identity
  // on every parent re-render, and this build re-inits the store from `data`
  // on each change — which wiped every provided listing back to "My files".)
  const [routeData, setRouteData] = useState<SvarEntry[]>([]);
  const apiRef = useRef<IApi | null>(null);
  const memberRef = useRef(memberId);
  const pathRef = useRef(path);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  // Subfolder requests already fed to the store, plus in-flight loads, so a
  // repeated store request for the same folder never fetches twice. The route
  // folder itself always flows through `routeData`, never `provide-data`
  // (feeding both would duplicate its rows in the store).
  const providedRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Set<string>>(new Set());
  const routeInflightRef = useRef<Set<string>>(new Set());
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

  const fetchRoute = useCallback(async () => {
    const requestMember = memberRef.current;
    const requestPath = pathRef.current;
    if (!requestMember) return;
    const scope = `${requestMember}:${requestPath}`;
    if (routeInflightRef.current.has(scope)) return;
    routeInflightRef.current.add(scope);
    try {
      const result = await api.list(requestPath);
      if (memberRef.current !== requestMember || pathRef.current !== requestPath) return;
      if (!Array.isArray(result)) {
        setRouteData([]);
        setLoadError(null);
        return;
      }
      const mapped = buildRouteData(requestPath, result);
      // The panel path node must exist in the tree: the root is built in,
      // deeper folders ride with their ancestor chain plus children.
      setRouteData(mapped);
      setLoadError(null);
    } catch (error) {
      if (memberRef.current !== requestMember || pathRef.current !== requestPath) return;
      if (error instanceof ApiError && (error.failure.kind === 'aborted' || error.failure.kind === 'unauthorized')) {
        return;
      }
      setRouteData([]);
      setLoadError({
        kind: error instanceof ApiError && error.failure.kind === 'not-found' ? 'not-found' : 'offline',
      });
    } finally {
      routeInflightRef.current.delete(scope);
    }
  }, []);

  const fetchRouteRef = useRef(fetchRoute);
  fetchRouteRef.current = fetchRoute;

  const loadData = useCallback(async (event: { id: string }) => {
    const requestMember = memberRef.current;
    if (!requestMember) return;
    const targetId = event.id;
    const requestPath = fromSvarId(targetId);
    // The route folder always flows through the `data` prop: a store request
    // for it just refetches the route (breadcrumb refresh), never provides.
    if (requestPath === pathRef.current) {
      void fetchRouteRef.current();
      return;
    }
    const scope = `${requestMember}:${targetId}`;
    if (providedRef.current.has(scope) || inflightRef.current.has(scope)) return;
    inflightRef.current.add(scope);
    try {
      const result = await loadExplorerFolder({
        svarId: targetId,
        memberPath: requestPath,
        list: (folder) => api.list(folder),
        provide: (id, data) => apiRef.current?.exec('provide-data', { id, data }),
      });
      // A member switch during the fetch must not render stale data.
      if (memberRef.current !== requestMember) return;
      if (result.status === 'ok') providedRef.current.add(scope);
      // Subfolders render inside their own panels; the banner stays reserved
      // for the route folder.
    } finally {
      inflightRef.current.delete(scope);
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
    // No data load here: the route effect below fetches the folder into the
    // `data` prop, which is the store's deterministic first-render channel.
    // (Providing from init raced the store setup and was silently dropped.)
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

  // Route changes (deep link, Back, in-explorer navigation) re-fetch the
  // folder into the `data` prop; retry bumps `attempt` and remounts.
  useEffect(() => {
    setRouteData([]);
    void fetchRoute();
  }, [path, memberId, attempt, fetchRoute]);

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
            data={routeData}
            mode="table"
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
