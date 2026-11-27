import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import { api } from '../api/client';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatePanel } from '../components/StatePanel';
import { getLastInput } from '../app/inputMode';
import { useSession } from '../app/SessionContext';
import { fromState } from './useRememberReturn';

type Load =
  | { status: 'loading' }
  | { status: 'ready'; text: string }
  | { status: 'folder' }
  | { status: 'not-found' }
  | { status: 'unavailable'; message: string }
  | { status: 'offline' };

export function FileReader() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useSession();
  const path = (params['*'] ?? '').replace(/\/+$/, '');
  const name = path.split('/').filter(Boolean).pop() ?? 'File';
  const parent = path.split('/').slice(0, -1).join('/');
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const from = fromState(location.state);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    setLoad({ status: 'loading' });
    (async () => {
      try {
        const result = await api.read(path, { signal: controller.signal });
        if (cancelled || controller.signal.aborted) return;
        if (Array.isArray(result)) setLoad({ status: 'folder' });
        else if (typeof result.text === 'string') setLoad({ status: 'ready', text: result.text });
        else setLoad({ status: 'unavailable', message: 'This file does not contain readable text.' });
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        const kind = (error as { failure?: { kind?: string } }).failure?.kind;
        if (kind === 'aborted') return;
        if (kind === 'not-found') setLoad({ status: 'not-found' });
        else if (kind === 'invalid') setLoad({ status: 'unavailable', message: 'This file is not readable text in v0.2.' });
        else setLoad({ status: 'offline' });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [path, attempt, profile?.id]);

  useEffect(() => {
    if (load.status !== 'ready') return;
    if (getLastInput() === 'keyboard') headingRef.current?.focus();
  }, [load]);

  const back = () => {
    if (from) navigate(-1);
    else navigate(`/folder/${parent}`);
  };

  return (
    <div className="fo-route">
      <Breadcrumbs path={parent} leaf={name} />
      <Button startIcon={<ArrowBackIcon />} onClick={back} sx={{ mb: 1 }}>
        Back
      </Button>
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading>
        {name}
      </Typography>
      {load.status === 'loading' ? (
        <StatePanel title="Loading file" busy />
      ) : load.status === 'folder' ? (
        <StatePanel
          title="This is a folder"
          body="Open it to see its files."
          actionLabel="Browse folder"
          onAction={() => navigate(`/folder/${path}`)}
        />
      ) : load.status === 'not-found' ? (
        <StatePanel
          title="This file is not available"
          body="It may have been moved or removed."
          actionLabel="Go Home"
          onAction={() => navigate('/')}
          tone="error"
        />
      ) : load.status === 'offline' ? (
        <StatePanel
          title="The server is not reachable"
          body="Start the v0.1 FoundationOS Server or check its address, then try again."
          actionLabel="Try again"
          onAction={() => setAttempt((value) => value + 1)}
          tone="error"
        />
      ) : load.status === 'unavailable' ? (
        <StatePanel title="This file cannot be shown" body={load.message} tone="error" />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            <Button startIcon={<FolderOpenIcon />} variant="outlined" onClick={() => navigate(`/folder/${parent}`)}>
              Open containing folder
            </Button>
          </div>
          <pre className="fo-reader" tabIndex={0} aria-label={`${name} contents`}>{load.text}</pre>
        </>
      )}
    </div>
  );
}
