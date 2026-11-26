import { useEffect, useMemo } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useMediaQuery } from '@mui/material';
import { buildTheme } from '../theme';
import { Header } from '../components/Header';
import { TargetCursor } from '../components/TargetCursor';
import { ConnectView } from '../connect/ConnectView';
import { FileReader } from '../workspace/FileReader';
import { FolderView } from '../workspace/FolderView';
import { AppOverview } from '../workspace/AppOverview';
import { SettingsView } from '../settings/SettingsView';
import { StatePanel } from '../components/StatePanel';
import { useNavigate } from 'react-router-dom';
import { motionIsReduced, usePreferences } from './PreferencesContext';
import { useSession } from './SessionContext';
import { installInputTracking } from './inputMode';
import { clearDescriptorCache } from '../workspace/useApps';
import { useServer } from './ServerContext';

function NotFound() {
  const navigate = useNavigate();
  return (
    <StatePanel
      title="That page is not part of this workspace"
      body="Check the address or return to your home."
      actionLabel="Go Home"
      onAction={() => navigate('/')}
    />
  );
}

function Protected() {
  const { profile } = useSession();
  if (!profile) return <ConnectView />;
  return (
    <Routes>
      <Route path="/" element={<FolderView />} />
      <Route path="/folder/*" element={<FolderView />} />
      <Route path="/app/*" element={<AppOverview />} />
      <Route path="/file/*" element={<FileReader />} />
      <Route path="/settings/:page" element={<SettingsView />} />
      <Route path="/connect" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export function App() {
  const { effective } = usePreferences();
  const { profile } = useSession();
  const { config } = useServer();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = effective.theme === 'system' ? prefersDark : effective.theme === 'dark';
  const theme = useMemo(() => buildTheme(effective, prefersDark), [effective, prefersDark]);
  const reduced = motionIsReduced(effective.motion);

  useEffect(() => {
    installInputTracking();
  }, []);

  useEffect(() => {
    clearDescriptorCache();
  }, [profile?.id]);

  useEffect(() => {
    document.title = profile ? `${profile.name} · FoundationOS 0.2` : 'FoundationOS 0.2';
  }, [profile]);

  useEffect(() => {
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  }, [dark]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div
        className={`fo-root${reduced ? ' fo-motion-reduced' : ''}`}
        data-theme={dark ? 'dark' : 'light'}
        data-surface={effective.surface}
        data-density={effective.density}
      >
        <div className="fo-backdrop" aria-hidden="true" />
        <TargetCursor enabled={effective.cursor === 'target'} reducedMotion={reduced} />
        <Header />
        <main className="fo-shell" id="main">
          <div className="fo-visually-hidden" role="status" aria-live="polite">
            {config?.check.ok ? `Server v${config.check.version} is ready.` : 'Server is not reachable.'}
          </div>
          <Protected />
        </main>
      </div>
    </ThemeProvider>
  );
}
