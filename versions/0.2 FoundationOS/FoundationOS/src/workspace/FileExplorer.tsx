import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useMediaQuery } from '@mui/material';
import { Filemanager, Willow, WillowDark } from '@svar-ui/react-filemanager';
import type { IApi } from '@svar-ui/react-filemanager';
import '@svar-ui/react-filemanager/all.css';
import { api, ApiError } from '../api/client';
import { useSession } from '../app/SessionContext';
import { usePreferences } from '../app/PreferencesContext';
import { getLastInput } from '../app/inputMode';
import { StatePanel } from '../components/StatePanel';
import { buildRouteData, loadExplorerFolder } from './explorerData';
import type { SvarEntry } from './explorerData';
import { explorerMenuOptions, fromSvarId, nextSortOrder, svarIconUrl, toSvarId } from './svarIds';
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
  // Narrow single pane: SVAR hides its own preview eye below ~768 px of
  // container width and swaps the whole view for the info pane whenever its
  // store preview flag is set, so the wrapper owns an explicit, labelled
  // Details toggle for narrow viewports. It mirrors the store flag and the
  // tapped file; the eye control keeps serving wide viewports.
  const [narrowPreview, setNarrowPreview] = useState(false);
  const narrowPreviewRef = useRef(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  // Single-tap preview is delayed so a double tap still reaches the grid's
  // own double-click handler (the first tap would otherwise unmount the
  // list before the second tap lands). The pending open is cancelled below
  // by open-file, folder navigation and route changes.
  const previewTimerRef = useRef<number | null>(null);
  const memberRef = useRef(memberId);
  const pathRef = useRef(path);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const explorerRef = useRef<HTMLDivElement | null>(null);
  // Wide layout shows the info/preview pane beside the list; narrow shows
  // the list first and opens info on demand. SVAR draws its own narrow line
  // near ~780 px of container width, so this threshold stays above it: in the
  // band between the two the list still renders, with info on selection.
  const [isWide, setIsWide] = useState(
    () => typeof window === 'undefined' || window.innerWidth >= 850,
  );
  const isWideRef = useRef(isWide);
  isWideRef.current = isWide;
  // Subfolder requests already fed to the store, plus in-flight loads, so a
  // repeated store request for the same folder never fetches twice. The route
  // folder itself always flows through `routeData`, never `provide-data`
  // (feeding both would duplicate its rows in the store).
  const providedRef = useRef<Set<string>>(new Set());
  const inflightRef = useRef<Set<string>>(new Set());
  const routeInflightRef = useRef<Set<string>>(new Set());
  // Sort state per member, folder and column. The vendored grid registers its
  // sort handler once at mount (closing over empty sorts), so without this
  // every header click would recompute "descending" and the toggle would
  // never engage. Rewriting the event in place keeps panel state intact.
  const sortOrderRef = useRef<Record<string, 'asc' | 'desc'>>({});
  memberRef.current = memberId;
  pathRef.current = path;

  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = effective.theme === 'system' ? prefersDark : effective.theme === 'dark';
  const Theme = dark ? WillowDark : Willow;

  // A new route or member starts clean; retry bumps `attempt` and remounts.
  useEffect(() => {
    setLoadError(null);
    // A new folder starts from the list, not a stale selection or preview.
    setSelectedFileId(null);
    setNarrowPreview(false);
    narrowPreviewRef.current = false;
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
  }, [path, memberId]);

  // Focus the heading on arrival for keyboard users; SVAR rows keep their own
  // tab order and visible focus once the explorer is mounted.
  useEffect(() => {
    if (getLastInput() !== 'keyboard') return;
    // The heading is visually hidden (the toolbar already titles this view),
    // so focus the visible search box; fall back to the heading for SR users.
    const search = document.querySelector('.fo-explorer input[type="text"]');
    if (search instanceof HTMLElement) search.focus();
    else headingRef.current?.focus();
    // Mount-only: browsing inside the explorer must not steal focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const element = explorerRef.current;
    if (!element || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === 'number') setIsWide(width >= 850);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // Drop a pending single-tap preview when the view unmounts.
  useEffect(
    () => () => {
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
    },
    [],
  );

  // Keyboard sorting: the vendored grid disables its own hotkeys, so Enter
  // and Space on the Name column would otherwise do nothing. Handle the key
  // here and stop propagation so the grid never double-handles it: the
  // toggle below shares the same per-folder state as mouse clicks, so both
  // inputs alternate deterministically.
  useEffect(() => {
    const element = explorerRef.current;
    if (!element) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const target = event.target as HTMLElement | null;
      const header = target?.closest?.('[data-header-id=":name"]');
      if (!header || !(header instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      const scope = `${memberRef.current}:${pathRef.current}:name`;
      const next = sortOrderRef.current[scope] === 'desc' ? 'asc' : 'desc';
      sortOrderRef.current[scope] = next;
      // The store keys per-panel sorts by SVAR id ('/' at the root), not by
      // member path ('' at the root): passing the member path writes the new
      // order under a key the grid never reads, so the toggle silently sticks.
      void apiRef.current?.exec('sort-files', { key: 'name', order: next, path: toSvarId(pathRef.current), panel: 0, corrected: true });
    };
    element.addEventListener('keydown', onKeyDown);
    return () => element.removeEventListener('keydown', onKeyDown);
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
    try {
      // The library preview close control and its context-menu Preview item
      // both exec show-preview internally; mirror the flag so the narrow
      // Details toggle label stays truthful without ever re-emitting.
      service.on('show-preview', (event: { mode?: unknown }) => {
        if (event && typeof event.mode === 'boolean') {
          setNarrowPreview(event.mode);
          narrowPreviewRef.current = event.mode;
        }
      });
    } catch {
      /* the toggle falls back to its optimistic state below */
    }
    try {
      service.intercept('sort-files', (event: { key?: unknown; order?: unknown; corrected?: unknown }) => {
        // Keyboard-driven sorts arrive pre-toggled; let those through and
        // only correct the grid's stuck-descending recomputation.
        if (event && typeof event === 'object' && event.corrected === true) return;
        const key = typeof event?.key === 'string' && event.key ? event.key : 'name';
        const scope = `${memberRef.current}:${pathRef.current}:${key}`;
        const order = nextSortOrder(sortOrderRef.current[scope], event?.order);
        sortOrderRef.current[scope] = order;
        if (event && typeof event === 'object') event.order = order;
      });
    } catch {
      /* sorting stays on the library default if interception is unavailable */
    }
  }, []);

  const handleSetPath = useCallback(
    (event: { id: string }) => {
      const next = fromSvarId(event.id);
      if (next === pathRef.current) return;
      // A new folder starts from the list, not a stale info pane.
      setSelectedFileId(null);
      setNarrowPreview(false);
      narrowPreviewRef.current = false;
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
      if (!isWideRef.current) void apiRef.current?.exec('show-preview', { mode: false });
      navigate(next ? `/files/${next}` : '/files');
    },
    [navigate],
  );

  // Narrow layouts hide the info pane until it is needed: selecting a file
  // shows its details, and the pane's close control hides them again.
  // (Desktop keeps the side-by-side preview, so this is a no-op there.)
  // The tapped file is remembered so the labelled Details toggle below can
  // reopen the pane after × closes it; folders clear the remembered file.
  // The takeover waits one double-click beat so a second tap still lands on
  // the mounted list and reaches the grid's open-file handler (reader).
  const handleSelectFile = useCallback((event: { id?: string }) => {
    const id = event?.id;
    if (!id) return;
    const file = apiRef.current?.getFile(id);
    if (!file) return;
    if (previewTimerRef.current !== null) {
      window.clearTimeout(previewTimerRef.current);
      previewTimerRef.current = null;
    }
    if (file.type !== 'file') {
      setSelectedFileId(null);
      return;
    }
    setSelectedFileId(id);
    if (isWideRef.current) return;
    previewTimerRef.current = window.setTimeout(() => {
      previewTimerRef.current = null;
      setNarrowPreview(true);
      narrowPreviewRef.current = true;
      void apiRef.current?.exec('show-preview', { mode: true });
    }, 300);
  }, []);

  // Labelled narrow preview toggle (SVAR draws no eye control below its
  // ~768 px narrow line). The store is read live so the action is always the
  // opposite of what is shown, even if a bus echo was missed; × and the
  // context-menu item report back through the show-preview subscription.
  const toggleNarrowPreview = useCallback(() => {
    const service = apiRef.current;
    if (!service || !selectedFileId) return;
    let next = !narrowPreviewRef.current;
    try {
      const preview = service.getState?.()?.preview;
      if (typeof preview === 'boolean') next = !preview;
    } catch {
      /* fall back to the tracked flag */
    }
    setNarrowPreview(next);
    narrowPreviewRef.current = next;
    void service.exec('show-preview', { mode: next });
  }, [selectedFileId]);

  const handleOpenFile = useCallback(
    (event: { id: string }) => {
      // A double tap won the race against the pending single-tap preview:
      // drop it so it cannot reopen over the reader after navigation.
      if (previewTimerRef.current !== null) {
        window.clearTimeout(previewTimerRef.current);
        previewTimerRef.current = null;
      }
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
      <Button
        size="small"
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 1 }}
        aria-label="Back to Home"
      >
        Home
      </Button>
      <Typography
        variant="h1"
        className="fo-page-title fo-visually-hidden"
        tabIndex={-1}
        ref={headingRef}
        data-page-heading
      >
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

      {/* Narrow single pane: SVAR draws no preview eye below its narrow line,
          so this labelled toggle opens the remembered file after × closes it
          and closes the pane while it covers the list. Wide keeps the eye. */}
      {!isWide ? (
        <div className="fo-explorer-actions">
          <Button
            variant={narrowPreview ? 'outlined' : 'contained'}
            size="small"
            disabled={!selectedFileId}
            onClick={toggleNarrowPreview}
            aria-pressed={narrowPreview}
            aria-label={narrowPreview ? 'Hide file details' : 'Show file details'}
          >
            {narrowPreview ? 'Hide details' : 'Show details'}
          </Button>
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

      <div className="fo-explorer" data-theme={dark ? 'dark' : 'light'} ref={explorerRef}>
        <Theme fonts={false}>
          <Filemanager
            key={`${memberId ?? 'none'}:${attempt}`}
            data={routeData}
            mode="table"
            preview={isWide}
            panels={panels}
            readonly
            icons={svarIconUrl}
            menuOptions={explorerMenuOptions}
            init={handleInit}
            onRequestData={loadData}
            onSetPath={handleSetPath}
            onOpenFile={handleOpenFile}
            onSelectFile={handleSelectFile}
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
