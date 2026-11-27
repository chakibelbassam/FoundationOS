import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DeleteIcon from '@mui/icons-material/Delete';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SaveIcon from '@mui/icons-material/Save';
import { api, ApiError } from '../api/client';
import { useSession } from '../app/SessionContext';

function messageOf(error: unknown) {
  if (error instanceof ApiError) {
    if (error.failure.kind === 'offline') return 'The server is unreachable.';
    if (error.failure.kind === 'server') return error.failure.message;
  }
  return 'That change could not be saved.';
}

function initials(name: string) {
  return name.slice(0, 2).toUpperCase();
}

export function ProfilePanel() {
  const navigate = useNavigate();
  const { profile, setProfile, signOut, signOutAll } = useSession();
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [email, setEmail] = useState(profile?.email ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [password, setPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [confirmAll, setConfirmAll] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setUsername(profile?.username ?? '');
    setBio(profile?.bio ?? '');
    setEmail(profile?.email ?? '');
  }, [profile?.id, profile?.username, profile?.bio, profile?.email]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  if (!profile) return null;

  const saveProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await api.updateProfile({ username, email: email.trim() || null, bio: bio.trim() || null });
      setProfile(next);
      setMessage('Profile saved.');
    } catch (failure) {
      setError(messageOf(failure));
    } finally {
      setBusy(false);
    }
  };

  const chooseAvatar = (file: File | null) => {
    setAvatarError(null);
    if (!file) return;
    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setAvatarError('Choose a PNG or JPEG picture.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError('Pictures must be 2 MB or smaller.');
      return;
    }
    setAvatarFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const saveAvatar = async () => {
    if (!avatarFile) return;
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await api.uploadAvatar(avatarFile);
      const next = await api.profile();
      setProfile(next);
      setAvatarFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (failure) {
      setAvatarError(messageOf(failure));
    } finally {
      setAvatarBusy(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarBusy(true);
    setAvatarError(null);
    try {
      await api.removeAvatar();
      const next = await api.profile();
      setProfile(next);
      setAvatarFile(null);
      setPreview(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (failure) {
      setAvatarError(messageOf(failure));
    } finally {
      setAvatarBusy(false);
    }
  };

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (passwordBusy) return;
    setPasswordError(null);
    if (nextPassword.length < 6) return setPasswordError('Use a password of at least 6 characters.');
    if (nextPassword !== confirmPassword) return setPasswordError('The new passwords do not match.');
    setPasswordBusy(true);
    try {
      await api.changePassword(password, nextPassword);
      await signOut();
      navigate('/signin', { replace: true, state: { message: 'Password changed. Sign in with the new password.' } });
    } catch (failure) {
      setPasswordError(messageOf(failure));
    } finally {
      setPasswordBusy(false);
    }
  };

  const closeAccount = async () => {
    if (deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const result = await api.closeAccount(deletePassword);
      await signOut();
      navigate('/signin', {
        replace: true,
        state: {
          message: `Account closed. The private Home is retained until ${new Date(result.retainedUntil).toLocaleDateString()}.`,
        },
      });
    } catch (failure) {
      setDeleteError(messageOf(failure));
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <>
      <section aria-label="Profile details">
        <div className="fo-panel">
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Profile</Typography>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 16 }}>
            <Avatar src={preview ?? profile.avatarUrl ?? undefined} sx={{ width: 64, height: 64 }}>
              {initials(profile.name)}
            </Avatar>
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                hidden
                onChange={(event) => chooseAvatar(event.target.files?.[0] ?? null)}
                aria-label="Choose a profile picture"
              />
              <Button size="small" startIcon={<PhotoCameraIcon />} onClick={() => fileRef.current?.click()} disabled={avatarBusy}>
                Choose picture
              </Button>
              {avatarFile ? (
                <Button size="small" onClick={() => void saveAvatar()} disabled={avatarBusy}>
                  Save picture
                </Button>
              ) : null}
              {profile.avatarUrl || avatarFile ? (
                <Button size="small" color="error" onClick={() => void removeAvatar()} disabled={avatarBusy}>
                  Remove
                </Button>
              ) : null}
            </div>
          </div>
          {avatarError ? <Alert severity="error" sx={{ mb: 2 }}>{avatarError}</Alert> : null}

          <form onSubmit={saveProfile} noValidate>
            <TextField
              fullWidth
              label="Username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              margin="normal"
              autoCapitalize="none"
              spellCheck={false}
              helperText="Lowercase, 2 to 39 characters. Your files stay with this account."
              disabled={busy}
            />
            <TextField
              fullWidth
              label="Introduction"
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              margin="normal"
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
              helperText={`${bio.length} of 500 characters`}
              disabled={busy}
            />
            <TextField
              fullWidth
              label="Email (optional)"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              margin="normal"
              helperText="Unverified."
              disabled={busy}
            />
            {error ? <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert> : null}
            {message ? <Alert severity="success" sx={{ mt: 2 }}>{message}</Alert> : null}
            <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={busy} sx={{ mt: 2 }}>
              Save profile
            </Button>
          </form>
        </div>
      </section>

      <section aria-label="Account" style={{ marginTop: 24 }}>
        <div className="fo-panel">
          <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Account</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Role: <strong>{profile.role}</strong>. A password change ends every session for this account, including this
            one.
          </Typography>
          <form onSubmit={changePassword} noValidate>
            <TextField
              fullWidth
              label="Current password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              margin="normal"
              disabled={passwordBusy}
            />
            <TextField
              fullWidth
              label="New password"
              type="password"
              autoComplete="new-password"
              value={nextPassword}
              onChange={(event) => setNextPassword(event.target.value)}
              margin="normal"
              disabled={passwordBusy}
            />
            <TextField
              fullWidth
              label="Repeat new password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              margin="normal"
              disabled={passwordBusy}
            />
            {passwordError ? <Alert severity="error" sx={{ mt: 2 }}>{passwordError}</Alert> : null}
            <Button type="submit" variant="contained" disabled={passwordBusy || !password || !nextPassword} sx={{ mt: 2 }}>
              Change password
            </Button>
          </form>

          <Divider sx={{ my: 3 }} />
          <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>Sessions</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            End every session for this account on this server, including this browser. Other members stay signed in.
          </Typography>
          <Button variant="outlined" onClick={() => setConfirmAll(true)}>
            Sign out of all sessions
          </Button>

          {profile.role === 'member' ? (
            <>
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 1 }}>Delete my account</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Access ends immediately. The private Home stays offline for 30 days, then it is permanently deleted and
                the username becomes available.
              </Typography>
              <Button color="error" variant="outlined" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
                Delete my account
              </Button>
            </>
          ) : (
            <Alert severity="info" sx={{ mt: 2 }}>
              The owner account cannot be deleted. Ownership transfer is not part of v0.3.
            </Alert>
          )}
        </div>
      </section>

      <Dialog open={confirmAll} onClose={() => setConfirmAll(false)} aria-labelledby="profile-sign-out-all-title">
        <DialogTitle id="profile-sign-out-all-title">Sign out of all sessions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This ends every session for {profile.name} on this server, including this browser. Other members stay
            signed in. Your files, settings and password are unchanged.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAll(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={async () => {
              setConfirmAll(false);
              await signOutAll();
              navigate('/signin', { replace: true });
            }}
          >
            Sign out of all sessions
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} aria-labelledby="delete-account-title">
        <DialogTitle id="delete-account-title">Delete your account?</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This ends access immediately and keeps your private Home offline for 30 days. After the deadline it is
            permanently deleted. Enter your password to confirm.
          </DialogContentText>
          <TextField
            fullWidth
            label="Password"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={(event) => setDeletePassword(event.target.value)}
            disabled={deleteBusy}
          />
          {deleteError ? <Alert severity="error" sx={{ mt: 2 }}>{deleteError}</Alert> : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleteBusy}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void closeAccount()} disabled={deleteBusy || !deletePassword}>
            Delete my account
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
