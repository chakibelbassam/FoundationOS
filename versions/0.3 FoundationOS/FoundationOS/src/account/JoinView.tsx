import { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import { useSession } from '../app/SessionContext';
import CodeSlots, { type CodeSlotsStatus } from '../vendor/reactbits/CodeSlots';
import { AccountShell } from './AccountShell';

export function JoinView() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { join } = useSession();
  const [code, setCode] = useState('');
  const [codeStatus, setCodeStatus] = useState<CodeSlotsStatus>('idle');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (code.length !== 6) return setError('Enter the six-digit invitation code.');
    if (password.length < 6) return setError('Use a password of at least 6 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    const result = await join(code, username, password, email);
    setBusy(false);
    if (result.ok) {
      navigate('/', { replace: true });
      return;
    }
    setError(result.error);
    setCodeStatus('error');
    window.setTimeout(() => setCodeStatus('idle'), 1200);
  };

  return (
    <AccountShell
      title="Join by invitation"
      subtitle="Enter the six-digit code from the server owner, then choose your own username, password and optional email."
      footer={
        <Link component={RouterLink} to="/signin">
          Already have an account? Sign in
        </Link>
      }
    >
      <form onSubmit={submit} noValidate>
        <div style={{ marginBottom: 8 }}>
          <CodeSlots
            length={6}
            value={code}
            status={codeStatus}
            onChange={setCode}
            onComplete={() => setError(null)}
            accentColor={theme.palette.primary.main}
            inkColor={theme.palette.primary.main}
            slotColor={theme.palette.action.hover}
            digitColor={theme.palette.primary.contrastText}
            dangerColor={theme.palette.error.main}
            slotSize={44}
            gap={8}
            radius={12}
            ariaLabel="Six-digit invitation code"
          />
        </div>
        <TextField
          fullWidth
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          margin="normal"
          autoCapitalize="none"
          spellCheck={false}
          helperText="Lowercase, 2 to 39 characters."
          disabled={busy}
        />
        <TextField
          fullWidth
          label="Password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          margin="normal"
          disabled={busy}
        />
        <TextField
          fullWidth
          label="Repeat password"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          margin="normal"
          disabled={busy}
        />
        <TextField
          fullWidth
          label="Email (optional)"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          margin="normal"
          disabled={busy}
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
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <GroupAddIcon />}
          disabled={busy || code.length !== 6 || !username.trim() || !password || !confirm}
          sx={{ mt: 2 }}
          fullWidth
        >
          {busy ? 'Joining…' : 'Join this server'}
        </Button>
      </form>
    </AccountShell>
  );
}
