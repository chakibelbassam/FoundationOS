import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LoginIcon from '@mui/icons-material/Login';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useServer } from '../app/ServerContext';
import { readHint, useSession } from '../app/SessionContext';

export function ConnectView() {
  const { status, connect, error } = useSession();
  const { config, check } = useServer();
  const location = useLocation();
  const [token, setToken] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hint = readHint();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLocalError(null);
    const result = await connect(token);
    if (!result.ok) {
      setLocalError(result.error);
      return;
    }
    setToken('');
  };

  const serverState = config?.check;
  const offline = serverState ? !serverState.ok : false;

  return (
    <div className="fo-route" style={{ maxWidth: 620, paddingTop: 28 }}>
      <Typography variant="h1" className="fo-page-title" tabIndex={-1}>
        Connect to your home
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '58ch' }}>
        Paste an existing member session token. It stays in memory for this tab only and is never written to the URL,
        storage or preferences.
      </Typography>

      {offline ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <strong>The client cannot reach its server.</strong>{' '}
          {serverState?.status === 'incompatible'
            ? `Expected v0.1, found ${serverState.version ?? 'unknown'}. Start the matching v0.1 server.`
            : 'Start the v0.1 FoundationOS Server, then check again.'}
          <div style={{ marginTop: 8 }}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => void check()}>
              Check server
            </Button>
          </div>
        </Alert>
      ) : (
        <Alert severity="info" sx={{ mb: 2 }}>
          Server {serverState?.version ? `v${serverState.version}` : 'checking'} at {config?.serverUrl ?? 'the configured address'}.
          {hint ? ` Last member on this browser: ${hint.name}.` : ''}
        </Alert>
      )}

      <form onSubmit={submit} noValidate>
        <TextField
          inputRef={inputRef}
          fullWidth
          label="Member session token"
          type="password"
          autoComplete="off"
          spellCheck={false}
          value={token}
          onChange={(event) => setToken(event.target.value)}
          helperText="Create one with the operator helper: node scripts/session.mjs --server <address>"
          disabled={status === 'connecting'}
        />
        <div className="fo-settings-actions">
          <Button
            type="submit"
            variant="contained"
            startIcon={status === 'connecting' ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
            disabled={status === 'connecting' || !token.trim()}
          >
            Connect
          </Button>
          <Button variant="text" onClick={() => void check()}>Check server</Button>
        </div>
      </form>

      {localError || error ? (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          {localError ?? error}
        </Alert>
      ) : null}

      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 3 }}>
        Requested location: {location.pathname}
      </Typography>
    </div>
  );
}
