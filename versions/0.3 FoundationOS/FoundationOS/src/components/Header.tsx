import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Popover from '@mui/material/Popover';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import CheckIcon from '@mui/icons-material/Check';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import CloudOffIcon from '@mui/icons-material/CloudOff';
import LoginIcon from '@mui/icons-material/Login';
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import { useServer } from '../app/ServerContext';
import { useSession } from '../app/SessionContext';
import { usePreferences } from '../app/PreferencesContext';

function useClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 15000);
    return () => window.clearInterval(timer);
  }, []);
  return now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export function Header() {
  const { profile, signOut, signOutAll } = useSession();
  const { config, check } = useServer();
  const { effective } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useClock();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [panelAnchor, setPanelAnchor] = useState<HTMLElement | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const userRef = useRef<HTMLButtonElement | null>(null);
  const chipRef = useRef<HTMLButtonElement | null>(null);

  const serverOk = config?.check.ok ?? false;
  const state = !serverOk ? 'offline' : profile ? 'connected' : 'signin';
  const label = state === 'connected' ? 'Connected' : state === 'signin' ? 'Sign in' : 'Server offline';
  const icon = state === 'connected' ? <CloudDoneIcon fontSize="small" /> : state === 'signin' ? <LoginIcon fontSize="small" /> : <CloudOffIcon fontSize="small" />;

  const endSession = async (all: boolean) => {
    setMenuAnchor(null);
    setConfirmAll(false);
    const result = all ? await signOutAll() : await signOut();
    navigate('/signin', { replace: true, state: result.warning ? { warning: result.warning } : undefined });
  };

  const goSettings = (page: string) => {
    setMenuAnchor(null);
    navigate(`/settings/${page}`);
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} className="fo-header" component="header">
      <Toolbar disableGutters sx={{ minHeight: 48, gap: 1 }}>
        <Typography component="div" className="fo-brand">
          FoundationOS
          <Typography component="span" variant="caption" sx={{ opacity: 0.6, fontWeight: 500 }}>0.3</Typography>
        </Typography>
        <Box className="fo-header-spacer" />
        <Box className="fo-header-controls">
          <span className="fo-clock" aria-label={`Local time ${clock}`}>{clock}</span>
          <Button
            ref={chipRef}
            size="small"
            color={state === 'connected' ? 'success' : state === 'signin' ? 'warning' : 'error'}
            startIcon={icon}
            onClick={(event) => {
              event.currentTarget.focus();
              setPanelAnchor(event.currentTarget);
            }}
            aria-haspopup="dialog"
            aria-expanded={Boolean(panelAnchor)}
          >
            {label}
          </Button>
          {profile ? (
            <>
              <Button
                ref={userRef}
                size="small"
                startIcon={<PersonIcon fontSize="small" />}
                onClick={(event) => {
                  event.currentTarget.focus();
                  setMenuAnchor(event.currentTarget);
                }}
                aria-haspopup="menu"
                aria-expanded={Boolean(menuAnchor)}
                className="fo-username"
                title={profile.name}
              >
                <span className="fo-username-text">{profile.name}</span>
              </Button>
              <Button
                size="small"
                aria-label="Settings"
                onClick={() => navigate('/settings/profile')}
                sx={{ minWidth: 0 }}
              >
                <SettingsIcon fontSize="small" />
              </Button>
            </>
          ) : (
            <Button size="small" onClick={() => void check()} aria-label="Settings unavailable until connected" disabled>
              <SettingsIcon fontSize="small" />
            </Button>
          )}
        </Box>
      </Toolbar>

      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={(_event, reason) => {
          setMenuAnchor(null);
          if (reason === 'escapeKeyDown') window.setTimeout(() => userRef.current?.focus(), 0);
        }}
        MenuListProps={{ 'aria-label': 'Profile menu' }}
        transitionDuration={effective.motion === 'off' ? 0 : 160}
      >
        <MenuItem onClick={() => goSettings('profile')}>
          <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
          {profile?.name} (active)
        </MenuItem>
        <MenuItem onClick={() => goSettings('profile')}>Profile settings</MenuItem>
        {profile?.role === 'owner' ? (
          <MenuItem onClick={() => goSettings('accounts')}>Accounts and invitations</MenuItem>
        ) : null}
        <Divider />
        <MenuItem onClick={() => void endSession(false)}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Sign out
        </MenuItem>
        <MenuItem onClick={() => { setMenuAnchor(null); setConfirmAll(true); }}>
          Sign out of all sessions
        </MenuItem>
      </Menu>

      <Dialog open={confirmAll} onClose={() => setConfirmAll(false)} aria-labelledby="sign-out-all-title">
        <DialogTitle id="sign-out-all-title">Sign out of all sessions?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This ends every session for {profile?.name} on this server, including this browser. Other members stay
            signed in. Your files, settings and password are unchanged.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAll(false)}>Cancel</Button>
          <Button color="error" variant="contained" onClick={() => void endSession(true)}>
            Sign out of all sessions
          </Button>
        </DialogActions>
      </Dialog>

      <Popover
        open={Boolean(panelAnchor)}
        anchorEl={panelAnchor}
        onClose={(_event, reason) => {
          setPanelAnchor(null);
          if (reason === 'escapeKeyDown') window.setTimeout(() => chipRef.current?.focus(), 0);
        }}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transitionDuration={effective.motion === 'off' ? 0 : 160}
      >
        <Box sx={{ p: 2, maxWidth: 340 }} role="dialog" aria-label="Server connection">
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Server connection</Typography>
          <Typography variant="body2" component="p" sx={{ mb: 1 }}>
            Address: <code>{config?.serverUrl ?? 'unknown'}</code>
          </Typography>
          <Typography variant="body2" component="p">
            Expected v{config?.expectedServerVersion ?? '0.1'} · found{' '}
            {config?.check.version ? `v${config.check.version}` : 'none'}
            {config?.check.schema ? ` · schema ${config.check.schema}` : ''}
          </Typography>
          <Typography variant="body2" component="p" sx={{ mt: 1, opacity: 0.8 }}>
            {profile
              ? `Signed in as ${profile.name} (${profile.role}). The server owns this session and can revoke it at any time.`
              : 'The server is reachable. Sign in with your username and password.'}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
            Last check: {config?.check.checkedAt ? new Date(config.check.checkedAt).toLocaleTimeString() : 'not yet'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 8, mt: 2 }}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => void check()}>Check connection</Button>
            {!profile ? (
              <Button size="small" variant="contained" onClick={() => { setPanelAnchor(null); navigate('/signin'); }}>
                Sign in
              </Button>
            ) : null}
          </Box>
          <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
            To change the server address, stop this client and relaunch Start.cmd with the new address. Your current
            location is {location.pathname}.
          </Typography>
        </Box>
      </Popover>
    </AppBar>
  );
}
