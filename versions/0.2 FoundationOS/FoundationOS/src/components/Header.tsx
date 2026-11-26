import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import PersonIcon from '@mui/icons-material/Person';
import RefreshIcon from '@mui/icons-material/Refresh';
import SettingsIcon from '@mui/icons-material/Settings';
import SyncProblemIcon from '@mui/icons-material/SyncProblem';
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
  const { profile, disconnect } = useSession();
  const { config, check } = useServer();
  const { effective } = usePreferences();
  const navigate = useNavigate();
  const location = useLocation();
  const clock = useClock();
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [panelAnchor, setPanelAnchor] = useState<HTMLElement | null>(null);

  const serverOk = config?.check.ok ?? false;
  const state = !serverOk ? 'offline' : profile ? 'connected' : 'reconnect';
  const label = state === 'connected' ? 'Connected' : state === 'reconnect' ? 'Reconnect' : 'Server offline';
  const icon = state === 'connected' ? <CloudDoneIcon fontSize="small" /> : state === 'reconnect' ? <SyncProblemIcon fontSize="small" /> : <CloudOffIcon fontSize="small" />;

  const goSettings = (page: string) => {
    setMenuAnchor(null);
    navigate(`/settings/${page}`);
  };

  return (
    <AppBar position="static" color="transparent" elevation={0} className="fo-header" component="header">
      <Toolbar disableGutters sx={{ minHeight: 48, gap: 1 }}>
        <Typography component="div" className="fo-brand">
          FoundationOS
          <Typography component="span" variant="caption" sx={{ opacity: 0.6, fontWeight: 500 }}>0.2</Typography>
        </Typography>
        <Box className="fo-header-spacer" />
        <Box className="fo-header-controls">
          <span className="fo-clock" aria-label={`Local time ${clock}`}>{clock}</span>
          <Button
            size="small"
            color={state === 'connected' ? 'success' : state === 'reconnect' ? 'warning' : 'error'}
            startIcon={icon}
            onClick={(event) => setPanelAnchor(event.currentTarget)}
            aria-haspopup="dialog"
            aria-expanded={Boolean(panelAnchor)}
          >
            {label}
          </Button>
          {profile ? (
            <>
              <Button
                size="small"
                startIcon={<PersonIcon fontSize="small" />}
                onClick={(event) => setMenuAnchor(event.currentTarget)}
                aria-haspopup="menu"
                aria-expanded={Boolean(menuAnchor)}
                className="fo-username"
                title={profile.name}
              >
                {profile.name}
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
        onClose={() => setMenuAnchor(null)}
        MenuListProps={{ 'aria-label': 'Profile menu' }}
        transitionDuration={effective.motion === 'off' ? 0 : 160}
      >
        <MenuItem onClick={() => goSettings('profile')}>
          <ListItemIcon><CheckIcon fontSize="small" /></ListItemIcon>
          {profile?.name} (active)
        </MenuItem>
        <MenuItem onClick={() => goSettings('profile')}>Profile settings</MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setMenuAnchor(null);
            disconnect();
          }}
        >
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          Disconnect
        </MenuItem>
      </Menu>

      <Popover
        open={Boolean(panelAnchor)}
        anchorEl={panelAnchor}
        onClose={() => setPanelAnchor(null)}
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
              ? `Signed in as ${profile.name} (${profile.role}). A ready server and a member session are separate: if the token expires, reconnect without restarting the server.`
              : 'The server is reachable. Connect with an existing member session token.'}
          </Typography>
          <Typography variant="caption" display="block" sx={{ mt: 1, opacity: 0.7 }}>
            Last check: {config?.check.checkedAt ? new Date(config.check.checkedAt).toLocaleTimeString() : 'not yet'}
          </Typography>
          <Box sx={{ display: 'flex', gap: 8, mt: 2 }}>
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => void check()}>Check connection</Button>
            {!profile ? (
              <Button size="small" variant="contained" onClick={() => { setPanelAnchor(null); void check(); }}>
                Reconnect
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
