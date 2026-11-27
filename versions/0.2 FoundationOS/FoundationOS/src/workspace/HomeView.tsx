import { useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useMediaQuery } from '@mui/material';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import AppsIcon from '@mui/icons-material/Apps';
import MagicBento from '../vendor/reactbits/MagicBento';
import '../vendor/reactbits/MagicBento.css';
import { useSession } from '../app/SessionContext';
import { usePreferences } from '../app/PreferencesContext';
import { motionIsReduced } from '../app/PreferencesContext';
import { getLastInput } from '../app/inputMode';
import { fromState } from './useRememberReturn';
import { clearResumeFocus, escapeSelector, readResumeFocus, setResumeFocus } from './focusReturn';
import { APP_INVENTORY_SCOPE } from './useAppInventory';

const HOME_TILE_KEY = 'foundationos.v0.2.home-tile';

function rememberTile(id: string) {
  try {
    sessionStorage.setItem(HOME_TILE_KEY, id);
  } catch {
    /* storage may be unavailable */
  }
}

function takeTile(): string | null {
  try {
    const value = sessionStorage.getItem(HOME_TILE_KEY);
    sessionStorage.removeItem(HOME_TILE_KEY);
    return value;
  } catch {
    return null;
  }
}

function leaf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function rowSecondary(label: string, secondary?: string | null): string | null {
  if (!secondary) return null;
  // A root entry's path is its display name; showing it twice wastes a line.
  return secondary === label ? null : secondary;
}

interface TileButtonProps {
  control: string;
  label: string;
  secondary?: string;
  path?: string;
  icon?: 'folder' | 'app';
  onGo: () => void;
}

function TileButton({ control, label, secondary, path, icon, onGo }: TileButtonProps) {
  const sub = rowSecondary(label, secondary);
  const full = sub ? `${label} · ${sub}` : label;
  return (
    <button
      type="button"
      className="fo-home-row"
      data-home-control={control}
      data-resume-path={path}
      data-target
      title={full}
      onClick={onGo}
    >
      <span className="fo-home-row-text">
        <span className="fo-home-row-label">
          {icon === 'folder' ? <FolderOpenIcon fontSize="small" aria-hidden="true" /> : null}
          {icon === 'app' ? <AppsIcon fontSize="small" aria-hidden="true" /> : null}
          <span className="fo-home-row-single">
            {label}
            {sub ? <span className="fo-home-row-path"> · {sub}</span> : null}
          </span>
        </span>
      </span>
    </button>
  );
}

export function HomeView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useSession();
  const { effective } = usePreferences();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const from = fromState(location.state);
  const projects = effective.projects ?? [];
  const recentApps = effective.recentApps ?? [];
  const reduced = motionIsReduced(effective.motion);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const dark = effective.theme === 'system' ? prefersDark : effective.theme === 'dark';

  const go = (to: string, tile: string, control?: string) => {
    rememberTile(control ?? tile);
    // Leaving for an overview records the app path on this entry, so Back
    // can restore focus to the originating row.
    if (to.startsWith('/app/')) setResumeFocus(to.replace(/^\/app\//, ''));
    navigate(to, { state: { from: { route: '/', path: tile } } });
  };

  // Back restores its source: an app row recorded on this entry wins, then
  // the tile control used on departure, then the heading for keyboard users.
  useEffect(() => {
    const resume = readResumeFocus(location.state);
    if (resume) {
      const row = document.querySelector(`[data-resume-path="${escapeSelector(resume)}"]`);
      if (row instanceof HTMLElement) {
        row.focus();
        const timer = window.setTimeout(() => clearResumeFocus(), 600);
        return () => window.clearTimeout(timer);
      }
    }
    const tile = takeTile();
    if (tile) {
      const target = document.querySelector(`[data-home-control="${escapeSelector(tile)}"]`);
      if (target instanceof HTMLElement) {
        target.focus();
        return;
      }
    }
    if (getLastInput() === 'keyboard') headingRef.current?.focus();
    // Mount-only: tile rows keep focus while Home stays mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const items = useMemo(
    () => [
      {
        title: 'File Explorer',
        description: 'Browse your private home, open folders and read files.',
        visual: 'dashboard',
        colSpan: 1,
        rowSpan: 1,
        content: (
          <div className="fo-home-tile fo-home-tile-app">
            <span className="fo-home-app-icon" aria-hidden="true">
              <FolderOpenIcon fontSize="large" />
            </span>
            <h2>Files</h2>
            <p>Your private home.</p>
            <Button
              variant="contained"
              size="small"
              data-home-control="explorer-open"
              data-target
              onClick={() => go('/files', 'explorer', 'explorer-open')}
            >
              Open
            </Button>
          </div>
        ),
      },
      {
        title: 'Projects',
        description: 'Folders you pinned for quick access.',
        visual: 'collaboration',
        colSpan: 2,
        rowSpan: 1,
        content: (
          <div className="fo-home-tile">
            <div className="fo-home-tile-head">
              <h2>Projects</h2>
              {projects.length > 0 ? (
                <span className="fo-home-count" aria-label={`${projects.length} pinned`}>
                  {projects.length} pinned
                </span>
              ) : null}
            </div>
            {projects.length === 0 ? (
              <p>No pinned projects yet. Pin a folder from the File Explorer.</p>
            ) : (
              <div className="fo-home-rows" role="list" aria-label="Pinned projects">
                {projects.slice(0, 3).map((entry, index) => (
                  <div role="listitem" key={entry}>
                    <TileButton
                      control={`project-${index}`}
                      label={leaf(entry)}
                      secondary={entry}
                      path={entry}
                      icon="folder"
                      onGo={() => go(`/files/${entry}`, `project-${index}`)}
                    />
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="text"
              size="small"
              data-home-control="projects-all"
              data-target
              onClick={() => go('/projects', 'projects', 'projects-all')}
            >
              Show all projects
            </Button>
          </div>
        ),
      },
      {
        title: 'Recent apps',
        description: 'Apps you opened recently.',
        visual: 'analytics',
        colSpan: 3,
        rowSpan: 1,
        content: (
          <div className="fo-home-tile">
            <div className="fo-home-tile-head">
              <AppsIcon fontSize="small" aria-hidden="true" />
              <h2>Recent apps</h2>
              {recentApps.length > 0 ? (
                <span className="fo-home-count" aria-label={`${recentApps.length} recent`}>
                  {recentApps.length} recent
                </span>
              ) : null}
            </div>
            {recentApps.length === 0 ? (
              <p>Open an app to see it here.</p>
            ) : (
              <div className="fo-home-rows" role="list" aria-label="Recently opened apps">
                {recentApps.slice(0, 3).map((entry, index) => (
                  <div role="listitem" key={entry}>
                    <TileButton
                      control={`app-${index}`}
                      label={leaf(entry)}
                      secondary={entry}
                      path={entry}
                      icon="app"
                      onGo={() => go(`/app/${entry}`, `app-${index}`)}
                    />
                  </div>
                ))}
              </div>
            )}
            <p className="fo-home-scope">{APP_INVENTORY_SCOPE}</p>
            <Button
              variant="text"
              size="small"
              data-home-control="apps-all"
              data-target
              onClick={() => go('/apps', 'apps', 'apps-all')}
            >
              Show all apps
            </Button>
          </div>
        ),
      },
      {
        title: 'Activity',
        description: 'Workspace activity appears here when a source is connected.',
        visual: 'automation',
        colSpan: 1,
        rowSpan: 2,
        content: (
          <div className="fo-home-tile">
            <div className="fo-home-tile-head">
              <h2>Activity</h2>
            </div>
            <p>No activity yet — no activity source is connected. This panel stays idle until a real source arrives.</p>
          </div>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects.join('|'), recentApps.join('|')],
  );

  return (
    <div className="fo-route fo-home">
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading>
        {profile ? `${profile.name}’s home` : 'Home'}
      </Typography>
      <Typography variant="body2" className="fo-page-subtitle" color="text.secondary">
        Your private workspace.
      </Typography>
      {from ? (
        <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 1 }}>
          Back returns to the previous view.
        </Typography>
      ) : null}
      <MagicBento
        items={items}
        columns={4}
        rowHeight={248}
        theme={dark ? 'dark' : 'light'}
        glowColor={undefined}
        textAutoHide={false}
        disableAnimations={reduced}
        onItemClick={undefined}
        className="fo-home-bento"
        style={{}}
      />
    </div>
  );
}
