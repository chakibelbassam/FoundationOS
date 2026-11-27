import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useSession } from '../app/SessionContext';
import { AccountShell } from './AccountShell';

export function SetupView() {
  const [params] = useSearchParams();
  const claim = params.get('claim') ?? '';
  const { setupOwner } = useSession();
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
    if (password.length < 6) return setError('Use a password of at least 6 characters.');
    if (password !== confirm) return setError('The passwords do not match.');
    setBusy(true);
    const result = await setupOwner(claim, username, password, email);
    setBusy(false);
    if (!result.ok) setError(result.error);
  };

  if (!claim) {
    return (
      <AccountShell title="Create the owner">
        <Alert severity="info">
          Open FoundationOS from the server console. Press <strong>O</strong> in the FoundationOS Server window; it
          creates a one-time setup link and opens this page with that link.
        </Alert>
      </AccountShell>
    );
  }

  return (
    <AccountShell
      title="Create the owner"
      subtitle="This is the first account on this installation. Choose the name you will sign in with. You will see a one-time recovery code after the account is created."
    >
      <form onSubmit={submit} noValidate>
        <TextField
          fullWidth
          label="Username"
          autoComplete="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          margin="normal"
          autoCapitalize="none"
          spellCheck={false}
          helperText="Lowercase, 2 to 39 characters. Names like admin and owner are reserved."
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
          helperText="At least 6 characters. A longer passphrase is better."
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
          helperText="Unverified. You can edit it later in Settings."
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
          startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <PersonAddIcon />}
          disabled={busy || !username.trim() || !password || !confirm}
          sx={{ mt: 2 }}
          fullWidth
        >
          {busy ? 'Creating…' : 'Create the owner'}
        </Button>
      </form>
    </AccountShell>
  );
}
