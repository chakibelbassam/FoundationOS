import type { ReactNode } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import RefreshIcon from '@mui/icons-material/Refresh';
import CircleIcon from '@mui/icons-material/Circle';
import { useServer } from '../app/ServerContext';

export function AccountShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { config, check } = useServer();
  const state = config?.check;
  const offline = state ? !state.ok : false;

  return (
    <div className="fo-route" style={{ maxWidth: 560, margin: '0 auto', paddingTop: 32 }}>
      <Typography variant="h1" className="fo-page-title" tabIndex={-1}>
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: '58ch' }}>
          {subtitle}
        </Typography>
      ) : null}

      <div className="fo-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <CircleIcon
            fontSize="inherit"
            sx={{ color: state?.ok ? 'success.main' : 'error.main', fontSize: 10 }}
            aria-hidden="true"
          />
          <Typography variant="body2" color="text.secondary">
            {state?.ok
              ? `Server v${state.version} at ${config?.serverUrl ?? 'the paired address'}`
              : state?.status === 'incompatible'
                ? `This client needs server v${config?.expectedServerVersion ?? '0.3'}; found ${state.version ?? 'an unknown version'}.`
                : 'The server is not reachable.'}
          </Typography>
          {offline ? (
            <Button size="small" startIcon={<RefreshIcon />} onClick={() => void check()}>
              Retry
            </Button>
          ) : null}
        </div>

        {offline ? (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {state?.status === 'incompatible'
              ? 'Start the matching v0.3 server. The client and server must both be 0.3.'
              : 'Start the v0.3 server, then retry. The account form is unavailable until it answers.'}
          </Alert>
        ) : null}

        {children}
      </div>

      {footer ? <div style={{ marginTop: 16 }}>{footer}</div> : null}
    </div>
  );
}
