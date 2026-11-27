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
  onGo: () => void;
}

function TileButton({ control, label, secondary, onGo }: TileButtonProps) {
  const sub = rowSecondary(label, secondary);
  return (
    <button
      type="button"
      className="fo-home-row"
      data-home-control={control}
      data-target
      onClick={onGo}
    >
      <span className="fo-home-row-text">
        <span className="fo-home-row-label">{label}</span>
        {sub ? <span className="fo-home-row-sub">{sub}</span> : null}
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
    navigate(to, { state: { from: { route: '/', path: tile } } });
  };

  // Back restores its source tile: the control used on departure is stored,
  // then focused once when Home mounts again.
  useEffect(() => {
    const tile = takeTile();
    if (tile) {
      const target = document.querySelector(`[data-home-control="${CSS.escape(tile)}"]`);
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
        colSpan: 2,
        rowSpan: 2,
        content: (
          <div className="fo-home-tile">
            <div className="fo-home-tile-head">
              <FolderOpenIcon fontSize="small" aria-hidden="true" />
              <h2>File Explorer</h2>
            </div>
            <p>Browse your private home, open folders and read files.</p>
            <Button
              variant="contained"
              size="small"
              data-home-control="explorer-open"
              data-target
              onClick={() => go('/files', 'explorer', 'explorer-open')}
            >
              Open File Explorer
            </Button>
          </div>
        ),
      },
      {
        title: 'Projects',
        description: 'Folders you pinned for quick access.',
        visual: 'collaboration',
        colSpan: 2,
        rowSpan: 2,
        content: (
          <div className="fo-home-tile">
            <div className="fo-home-tile-head">
              <h2>Projects</h2>
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
        colSpan: 2,
        rowSpan: 2,
        content: (
          <div className="fo-home-tile">
            <div className="fo-home-tile-head">
              <AppsIcon fontSize="small" aria-hidden="true" />
              <h2>Recent apps</h2>
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
        colSpan: 2,
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
        rowHeight={160}
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
