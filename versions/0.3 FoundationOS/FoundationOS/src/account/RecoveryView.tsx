import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import { useTheme } from '@mui/material/styles';
import KeyIcon from '@mui/icons-material/Key';
import { api, ApiError } from '../api/client';
import CodeSlots, { type CodeSlotsStatus } from '../vendor/reactbits/CodeSlots';
import { AccountShell } from './AccountShell';

function messageOf(error: unknown) {
  if (error instanceof ApiError) {
    if (error.failure.kind === 'unauthorized') return 'That code is not valid or has expired. Ask the owner for a new one.';
    if (error.failure.kind === 'offline') return 'The server is unreachable. Start it and try again.';
    if (error.failure.kind === 'server') return error.failure.message;
  }
  return 'The password could not be changed. Try again.';
}

export function RecoveryView() {
  const theme = useTheme();
  const [tab, setTab] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState('');
  const [ownerCode, setOwnerCode] = useState('');
  const [ownerPassword, setOwnerPassword] = useState('');
  const [ownerConfirm, setOwnerConfirm] = useState('');
  const [newRecovery, setNewRecovery] = useState<string | null>(null);

  const [memberCode, setMemberCode] = useState('');
  const [memberStatus, setMemberStatus] = useState<CodeSlotsStatus>('idle');
  const [memberPassword, setMemberPassword] = useState('');
  const [memberConfirm, setMemberConfirm] = useState('');
  const [memberDone, setMemberDone] = useState(false);

  const recoverOwner = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (ownerPassword.length < 6) return setError('Use a password of at least 6 characters.');
    if (ownerPassword !== ownerConfirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      const result = await api.recoverOwner(username, ownerCode, ownerPassword);
      setNewRecovery(result.recoveryCode);
      setOwnerPassword('');
      setOwnerConfirm('');
      setOwnerCode('');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const resetMember = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setError(null);
    if (memberCode.length !== 6) return setError('Enter the six-digit reset code.');
    if (memberPassword.length < 6) return setError('Use a password of at least 6 characters.');
    if (memberPassword !== memberConfirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      await api.resetMember(memberCode, memberPassword);
      setMemberDone(true);
      setMemberPassword('');
      setMemberConfirm('');
    } catch (failure) {
      setError(messageOf(failure));
      setMemberStatus('error');
      window.setTimeout(() => setMemberStatus('idle'), 1200);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AccountShell
      title="Recover access"
      subtitle="Members ask the server owner for a one-time reset code. The owner can use the recovery code saved when the account was created."
      footer={
        <Link component={RouterLink} to="/signin">
          Back to sign in
        </Link>
      }
    >
      <Tabs value={tab} onChange={(_event, next) => { setTab(next); setError(null); }} aria-label="Recovery method">
        <Tab label="Owner recovery code" />
        <Tab label="Member reset code" />
      </Tabs>

      {error ? (
        <Alert severity="error" sx={{ mt: 2 }} role="alert">
          {error}
        </Alert>
      ) : null}

      {tab === 0 ? (
        newRecovery ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Password changed.</strong> Your new recovery code is below. Save it now; it will not be shown again.
            <div style={{ margin: '12px 0', fontFamily: 'monospace', fontSize: 20, letterSpacing: 2 }}>{newRecovery}</div>
            <Button size="small" variant="outlined" onClick={() => void navigator.clipboard?.writeText(newRecovery)}>
              Copy code
            </Button>
            <div style={{ marginTop: 12 }}>
              <Link component={RouterLink} to="/signin">
                Sign in with the new password
              </Link>
            </div>
          </Alert>
        ) : (
          <form onSubmit={recoverOwner} noValidate>
            <TextField
              fullWidth
              label="Owner username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              margin="normal"
              autoCapitalize="none"
              spellCheck={false}
              disabled={busy}
            />
            <TextField
              fullWidth
              label="Recovery code"
              value={ownerCode}
              onChange={(event) => setOwnerCode(event.target.value)}
              margin="normal"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              autoComplete="off"
              spellCheck={false}
              disabled={busy}
              helperText="The 16-character code shown when the owner account was created."
            />
            <TextField
              fullWidth
              label="New password"
              type="password"
              autoComplete="new-password"
              value={ownerPassword}
              onChange={(event) => setOwnerPassword(event.target.value)}
              margin="normal"
              disabled={busy}
            />
            <TextField
              fullWidth
              label="Repeat new password"
              type="password"
              autoComplete="new-password"
              value={ownerConfirm}
              onChange={(event) => setOwnerConfirm(event.target.value)}
              margin="normal"
              disabled={busy}
            />
            <Button
              type="submit"
              variant="contained"
              startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />}
              disabled={busy || !username.trim() || !ownerCode || !ownerPassword || !ownerConfirm}
              sx={{ mt: 2 }}
              fullWidth
            >
              {busy ? 'Recovering…' : 'Use the recovery code'}
            </Button>
          </form>
        )
      ) : memberDone ? (
        <Alert severity="success" sx={{ mt: 2 }}>
          <strong>Password changed.</strong> Sign in with the new password; your files and settings are unchanged.
          <div style={{ marginTop: 12 }}>
            <Link component={RouterLink} to="/signin">
              Go to sign in
            </Link>
          </div>
        </Alert>
      ) : (
        <form onSubmit={resetMember} noValidate>
          <div style={{ margin: '16px 0 8px' }}>
            <CodeSlots
              length={6}
              value={memberCode}
              status={memberStatus}
              onChange={setMemberCode}
              accentColor={theme.palette.primary.main}
              inkColor={theme.palette.primary.main}
              slotColor={theme.palette.action.hover}
              digitColor={theme.palette.primary.contrastText}
              dangerColor={theme.palette.error.main}
              slotSize={44}
              gap={8}
              radius={12}
              ariaLabel="Six-digit reset code"
            />
          </div>
          <TextField
            fullWidth
            label="New password"
            type="password"
            autoComplete="new-password"
            value={memberPassword}
            onChange={(event) => setMemberPassword(event.target.value)}
            margin="normal"
            disabled={busy}
          />
          <TextField
            fullWidth
            label="Repeat new password"
            type="password"
            autoComplete="new-password"
            value={memberConfirm}
            onChange={(event) => setMemberConfirm(event.target.value)}
            margin="normal"
            disabled={busy}
          />
          <Button
            type="submit"
            variant="contained"
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <KeyIcon />}
            disabled={busy || memberCode.length !== 6 || !memberPassword || !memberConfirm}
            sx={{ mt: 2 }}
            fullWidth
          >
            {busy ? 'Changing…' : 'Use the reset code'}
          </Button>
        </form>
      )}
    </AccountShell>
  );
}
