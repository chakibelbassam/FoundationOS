import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import AppsIcon from '@mui/icons-material/Apps';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { api } from '../api/client';
import type { AppDescriptor, Entry } from '../api/types';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatePanel } from '../components/StatePanel';
import { getLastInput } from '../app/inputMode';
import { useSession } from '../app/SessionContext';
import { clearResumeFocus, readResumeFocus, setResumeFocus } from './focusReturn';
import { fromState } from './useRememberReturn';

type Load =
  | { status: 'loading' }
  | { status: 'ready'; entries: Entry[]; descriptor: AppDescriptor; hasReadme: boolean }
  | { status: 'not-found' }
  | { status: 'offline'; message: string };

function parseDescriptor(text: string, fallback: string): AppDescriptor {
  try {
    const parsed = JSON.parse(text) as { name?: unknown; brief?: unknown };
    if (typeof parsed.name === 'string' && parsed.name.trim()) {
      return {
        name: parsed.name.trim(),
        brief: typeof parsed.brief === 'string' && parsed.brief.trim() ? parsed.brief.trim() : undefined,
      };
    }
  } catch {
    /* fall through */
  }
  return { name: fallback };
}

export function AppOverview() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const path = (params['*'] ?? '').replace(/\/+$/, '');
  const name = path.split('/').filter(Boolean).pop() ?? 'App';
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const readmeRef = useRef<HTMLButtonElement | null>(null);
  const browseRef = useRef<HTMLButtonElement | null>(null);
  const from = fromState(location.state);
  const returnPath = readResumeFocus(location.state);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    (async () => {
      try {
        const listing = await api.read(path, { signal: controller.signal });
        if (cancelled || controller.signal.aborted) return;
        let descriptor: AppDescriptor = { name };
        let hasReadme = false;
        try {
          const manifest = await api.read(`${path}/app.json`, { signal: controller.signal });
          if (!Array.isArray(manifest) && typeof manifest.text === 'string') {
            descriptor = parseDescriptor(manifest.text, name);
          }
        } catch {
          if (controller.signal.aborted) return;
          /* a changed descriptor leaves the folder usable */
        }
        try {
          const readme = await api.read(`${path}/README.md`, { signal: controller.signal });
          hasReadme = !Array.isArray(readme) && typeof readme.text === 'string';
        } catch {
          if (controller.signal.aborted) return;
          hasReadme = false;
        }
        if (cancelled || controller.signal.aborted) return;
        if (Array.isArray(listing)) setLoad({ status: 'ready', entries: listing, descriptor, hasReadme });
        else setLoad({ status: 'not-found' });
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        const kind = (error as { failure?: { kind?: string } }).failure?.kind;
        if (kind === 'aborted') return;
        if (kind === 'not-found') setLoad({ status: 'not-found' });
        else setLoad({ status: 'offline', message: 'The app folder could not be read. Check the server and try again.' });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, attempt, name, profile?.id]);

  useEffect(() => {
    if (load.status !== 'ready') return;
    if (returnPath === `${path}/README.md`) {
      if (load.hasReadme) readmeRef.current?.focus();
      else headingRef.current?.focus();
      return;
    }
    if (returnPath) return;
    if (getLastInput() === 'keyboard') headingRef.current?.focus();
  }, [load, returnPath, path]);

  useEffect(() => {
    if (!returnPath) return;
    const timer = window.setTimeout(() => clearResumeFocus(), 600);
    return () => window.clearTimeout(timer);
  }, [returnPath]);

  const back = () => {
    if (from) navigate(-1);
    else navigate(`/folder/${path}`);
  };

  const openFrom = { route: location.pathname, path: `${path}/README.md` };
  const browseFrom = { route: location.pathname, path };

  return (
    <div className="fo-route">
      <Breadcrumbs path={path.split('/').slice(0, -1).join('/')} leaf={name} />
      <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ mb: 1 }}>
        Back
      </Button>
      {load.status === 'loading' ? (
        <StatePanel title="Loading app" busy />
      ) : load.status === 'not-found' ? (
        <StatePanel
          title="This app is not available"
          body="The folder may have been removed or renamed."
          actionLabel="Go Home"
          onAction={() => navigate('/')}
          tone="error"
        />
      ) : load.status === 'offline' ? (
        <StatePanel
          title="The app could not be read"
          body={load.message}
          actionLabel="Try again"
          onAction={() => setAttempt((value) => value + 1)}
          tone="error"
        />
      ) : (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="fo-card-icon" aria-hidden="true"><AppsIcon /></span>
            <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading sx={{ mb: 0 }}>
              {load.descriptor.name}
            </Typography>
          </div>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            App · {path}
          </Typography>
          {load.descriptor.brief ? (
            <Typography variant="body1" sx={{ maxWidth: '62ch', mb: 3 }}>{load.descriptor.brief}</Typography>
          ) : null}
          <div className="fo-actions" style={{ gap: 10 }}>
            {load.hasReadme ? (
              <Button
                ref={readmeRef}
                variant="contained"
                startIcon={<MenuBookIcon />}
                onClick={() => {
                  setResumeFocus(`${path}/README.md`);
                  navigate(`/file/${path}/README.md`, { state: { from: openFrom } });
                }}
              >
                Open README
              </Button>
            ) : null}
            <Button
              ref={!load.hasReadme ? browseRef : undefined}
              variant={load.hasReadme ? 'outlined' : 'contained'}
              startIcon={<FolderOpenIcon />}
              onClick={() => {
                setResumeFocus(path);
                navigate(`/files/${path}`, { state: { from: browseFrom } });
              }}
            >
              Browse files
            </Button>
          </div>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
            {load.entries.length} {load.entries.length === 1 ? 'entry' : 'entries'} in this app folder. Running the app
            arrives in a later increment.
          </Typography>
        </>
      )}
    </div>
  );
}
