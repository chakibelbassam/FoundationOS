import { useCallback, useEffect, useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import RefreshIcon from '@mui/icons-material/Refresh';
import { api, ApiError } from '../api/client';
import type { AccountSummary, Invitation, NewInvitation, ResetCode } from '../api/types';

function messageOf(error: unknown) {
  if (error instanceof ApiError) {
    if (error.failure.kind === 'offline') return 'The server is unreachable.';
    if (error.failure.kind === 'server') return error.failure.message;
  }
  return 'That action could not be completed.';
}

export function AccountsPanel() {
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [invite, setInvite] = useState<NewInvitation | null>(null);
  const [reset, setReset] = useState<{ username: string; code: ResetCode } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [nextAccounts, nextInvitations] = await Promise.all([api.accounts(), api.invitations()]);
      setAccounts(nextAccounts);
      setInvitations(nextInvitations);
    } catch (failure) {
      setError(messageOf(failure));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createInvite = async () => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const created = await api.createInvitation();
      setInvite(created);
      await load();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await api.revokeInvitation(id);
      await load();
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const issueReset = async (account: AccountSummary) => {
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const code = await api.createResetCode(account.id);
      setReset({ username: account.username, code });
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section aria-label="Accounts and invitations">
      <div className="fo-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Typography variant="h2" component="h2" sx={{ flex: 1 }}>Accounts and invitations</Typography>
          <Button size="small" startIcon={<RefreshIcon />} onClick={() => void load()} disabled={busy}>
            Refresh
          </Button>
        </div>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Invite a member with a six-digit code. The code is valid for 24 hours and can be used once. The member chooses
          their own username and password.
        </Typography>
        <Button variant="contained" startIcon={<GroupAddIcon />} onClick={() => void createInvite()} disabled={busy}>
          Create invitation
        </Button>

        {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}

        {invite ? (
          <Alert severity="success" sx={{ mt: 2 }}>
            <strong>Invitation code:</strong>{' '}
            <span style={{ fontFamily: 'monospace', fontSize: 24, letterSpacing: 4 }}>{invite.code}</span>
            <div style={{ marginTop: 8 }}>
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => void copy(invite.code)}>
                {copied ? 'Copied' : 'Copy code'}
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Valid until {new Date(invite.expiresAt).toLocaleString()}. Share it only with the person you are inviting.
              </Typography>
            </div>
          </Alert>
        ) : null}

        {reset ? (
          <Alert severity="info" sx={{ mt: 2 }}>
            <strong>Reset code for {reset.username}:</strong>{' '}
            <span style={{ fontFamily: 'monospace', fontSize: 24, letterSpacing: 4 }}>{reset.code.code}</span>
            <div style={{ marginTop: 8 }}>
              <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => void copy(reset.code.code)}>
                {copied ? 'Copied' : 'Copy code'}
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Expires {new Date(reset.code.expiresAt).toLocaleString()}. Share it privately; the member chooses a new
                password.
              </Typography>
            </div>
          </Alert>
        ) : null}

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>Members</Typography>
        {accounts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No accounts yet.</Typography>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {accounts.map((account) => (
              <li key={account.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid rgba(120,130,150,0.18)' }}>
                <div style={{ flex: 1 }}>
                  <Typography variant="body1">
                    <strong>{account.username}</strong>{' '}
                    <Chip size="small" label={account.role} sx={{ ml: 1 }} />
                    {account.closed_at ? <Chip size="small" color="warning" label="closed" sx={{ ml: 1 }} /> : null}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {account.email ?? 'No email'} · created {new Date(account.created_at).toLocaleDateString()}
                    {account.closed_at && account.retained_until
                      ? ` · retained until ${new Date(account.retained_until).toLocaleDateString()}`
                      : ''}
                  </Typography>
                </div>
                {account.role === 'member' && !account.closed_at ? (
                  <Button size="small" onClick={() => void issueReset(account)} disabled={busy}>
                    Reset password
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        <Divider sx={{ my: 3 }} />
        <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>Invitations</Typography>
        {invitations.length === 0 ? (
          <Typography variant="body2" color="text.secondary">No invitations yet.</Typography>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {invitations.map((invitation) => (
              <li key={invitation.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                <div style={{ flex: 1 }}>
                  <Chip size="small" label={invitation.state} />
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    Created {new Date(invitation.createdAt).toLocaleString()} · expires{' '}
                    {new Date(invitation.expiresAt).toLocaleString()}
                  </Typography>
                </div>
                {invitation.state === 'pending' ? (
                  <Button size="small" color="error" onClick={() => void revoke(invitation.id)} disabled={busy}>
                    Revoke
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
