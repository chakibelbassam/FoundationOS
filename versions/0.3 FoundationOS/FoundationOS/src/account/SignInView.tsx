import { useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import LoginIcon from '@mui/icons-material/Login';
import { useSession } from '../app/SessionContext';
import { AccountShell } from './AccountShell';

function returnPath(state: unknown) {
  const from = (state as { from?: { pathname?: string; search?: string } } | null)?.from;
  if (!from?.pathname) return '/';
  return `${from.pathname}${from.search ?? ''}`;
}

export function SignInView() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const result = await signIn(username, password, remember);
    setBusy(false);
    if (result.ok) navigate(returnPath(location.state), { replace: true });
    else setError(result.error);
  };

  return (
    <AccountShell
      title="Sign in"
      subtitle="Your username and password are checked by your own FoundationOS server. The session stays on this browser when you choose Remember me."
      footer={
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <Link component={RouterLink} to="/join">
            Join by invitation
          </Link>
          <Link component={RouterLink} to="/recover">
            Need help signing in?
          </Link>
        </div>
      }
    >
      <form onSubmit={submit} noValidate>
        <TextField
          inputRef={inputRef}
          fullWidth
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          disabled={busy}
          margin="normal"
          autoCapitalize="none"
          spellCheck={false}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={busy}
          margin="normal"
        />
        <FormControlLabel
          control={<Checkbox checked={remember} onChange={(event) => setRemember(event.target.checked)} />}
          label="Remember me on this browser"
        />
        {error ? (
          <Alert severity="error" sx={{ mt: 2 }} role="alert">
            {error}
          </Alert>
        ) : null}
        <Button
          type="submit"
          variant="contained"
          size="large"
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <LoginIcon />}
          disabled={busy || !username.trim() || !password}
          sx={{ mt: 2 }}
          fullWidth
        >
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AccountShell>
  );
}
