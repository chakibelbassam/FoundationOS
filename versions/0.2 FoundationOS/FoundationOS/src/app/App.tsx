import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, useMediaQuery } from '@mui/material';
import { buildTheme } from '../theme';
import { Header } from '../components/Header';
import { TargetCursor } from '../components/TargetCursor';
import { StatePanel } from '../components/StatePanel';
import { ConnectView } from '../connect/ConnectView';
import { FileReader } from '../workspace/FileReader';
import { FolderView } from '../workspace/FolderView';
import { AppOverview } from '../workspace/AppOverview';
import { ProjectsView } from '../workspace/ProjectsView';
import { AppsView } from '../workspace/AppsView';
import { SettingsView } from '../settings/SettingsView';
import { useLocation, useNavigate } from 'react-router-dom';
import { motionIsReduced, usePreferences } from './PreferencesContext';
import { useSession } from './SessionContext';
import { installInputTracking } from './inputMode';
import { clearDescriptorCache } from '../workspace/useApps';
import { clearInventoryCache } from '../workspace/useAppInventory';
import { BackgroundHost } from './BackgroundHost';
import { useServer } from './ServerContext';

// Heavy views load on demand so the first paint stays a single small chunk:
// the SVAR explorer, the Magic Bento home and the WebGL backgrounds.
const HomeView = lazy(() => import('../workspace/HomeView').then((module) => ({ default: module.HomeView })));
const FileExplorer = lazy(() =>
  import('../workspace/FileExplorer').then((module) => ({ default: module.FileExplorer })),
);

function RouteFallback() {
  return <StatePanel title="Loading view" busy />;
}

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

function SwitchHome() {
  const { clearReplaced } = useSession();
  useEffect(() => {
    clearReplaced();
  }, [clearReplaced]);
  return <Navigate to="/" replace />;
}

function Protected() {
  const { profile, wasReplaced } = useSession();
  if (!profile) return <ConnectView />;
  if (wasReplaced) return <SwitchHome />;
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Suspense fallback={<RouteFallback />}>
            <HomeView />
          </Suspense>
        }
      />
      <Route path="/folder/*" element={<FolderView />} />
      <Route
        path="/files"
        element={
          <Suspense fallback={<RouteFallback />}>
            <FileExplorer />
          </Suspense>
        }
      />
      <Route
        path="/files/*"
        element={
          <Suspense fallback={<RouteFallback />}>
            <FileExplorer />
          </Suspense>
        }
      />
      <Route path="/projects" element={<ProjectsView />} />
      <Route path="/apps" element={<AppsView />} />
      <Route path="/app/*" element={<AppOverview />} />
      <Route path="/file/*" element={<FileReader />} />
      <Route path="/settings/:page" element={<SettingsView />} />
      <Route path="/connect" element={<Navigate to="/" replace />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function usePreviewSize(search: string) {
  const stored = () => {
    try {
      const raw = sessionStorage.getItem('foundationos.qa.size');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { w?: number; h?: number };
      return { w: Number(parsed.w) || null, h: Number(parsed.h) || null };
    } catch {
      return null;
    }
  };
  const [size, setSize] = useState<{ w: number | null; h: number | null }>(() => stored() ?? { w: null, h: null });
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (!params.has('w')) return;
    const w = Number(params.get('w'));
    const h = params.has('h') ? Number(params.get('h')) : null;
    const next = {
      w: Number.isFinite(w) && w >= 280 && w <= 900 ? w : null,
      h: h !== null && Number.isFinite(h) && h >= 400 && h <= 1200 ? h : null,
    };
    try {
      sessionStorage.setItem('foundationos.qa.size', JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSize(next);
  }, [search]);
  return size;
}

export function App() {
  const { effective } = usePreferences();
  const { profile } = useSession();
  const { config } = useServer();
  const location = useLocation();
  const preview = usePreviewSize(location.search);
  const previewWidth = preview.w;
  const previewHeight = preview.h;
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = effective.theme === 'system' ? prefersDark : effective.theme === 'dark';
  const theme = useMemo(() => buildTheme(effective, prefersDark), [effective, prefersDark]);
  const reduced = motionIsReduced(effective.motion);

  useEffect(() => {
    installInputTracking();
  }, []);

  useEffect(() => {
    clearDescriptorCache();
    clearInventoryCache();
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
        style={
          previewWidth
            ? {
                maxWidth: `${previewWidth}px`,
                margin: '0 auto',
                boxShadow: '0 0 0 1px rgba(90, 110, 150, 0.35)',
                ...(previewHeight ? { height: `${previewHeight}px`, minHeight: `${previewHeight}px`, overflowY: 'auto' as const } : {}),
              }
            : undefined
        }
      >
        <div className="fo-backdrop" aria-hidden="true">
          <Suspense fallback={null}>
            <BackgroundHost background={effective.background} reducedMotion={reduced} dark={dark} />
          </Suspense>
          <div className="fo-backdrop-scrim" aria-hidden="true" />
        </div>
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
