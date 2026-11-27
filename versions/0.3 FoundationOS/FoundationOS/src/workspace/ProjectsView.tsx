import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { usePreferences } from '../app/PreferencesContext';
import { getLastInput } from '../app/inputMode';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatePanel } from '../components/StatePanel';
import { clearResumeFocus, escapeSelector, readResumeFocus } from './focusReturn';
import { rowSecondary } from './HomeView';

function leaf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function ProjectsView() {
  const navigate = useNavigate();
  const location = useLocation();
  const { effective, saveError, toggleProject } = usePreferences();
  const projects = effective.projects ?? [];
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  // An app row recorded on this entry before leaving for its overview.
  const resumePath = readResumeFocus(location.state);

  useEffect(() => {
    if (!resumePath) {
      if (getLastInput() === 'keyboard') headingRef.current?.focus();
      return;
    }
    const row = document.querySelector(`[data-resume-path="${escapeSelector(resumePath)}"]`);
    if (row instanceof HTMLElement) row.focus();
    else headingRef.current?.focus();
    const timer = window.setTimeout(() => clearResumeFocus(), 600);
    return () => window.clearTimeout(timer);
    // Mount-only: rows keep focus while this view stays mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fo-route">
      <Breadcrumbs path="" />
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading>
        Projects
      </Typography>
      <Typography variant="body2" className="fo-page-subtitle" color="text.secondary">
        Folders you pinned for quick access. Pin or unpin folders from the File Explorer.
      </Typography>

      {saveError ? (
        <Typography variant="body2" color="error" role="status" sx={{ mb: 2 }}>
          {saveError}
        </Typography>
      ) : null}

      {projects.length === 0 ? (
        <StatePanel
          title="No pinned projects yet"
          body="Open the File Explorer, choose a folder and pin it as a project."
          actionLabel="Open File Explorer"
          onAction={() => navigate('/files')}
        />
      ) : (
        <div className="fo-home-rows" role="list" aria-label="Pinned projects">
          {projects.map((entry) => (
            <div role="listitem" key={entry} className="fo-list-row">
              <button
                type="button"
                className="fo-home-row"
                data-target
                data-resume-path={entry}
                onClick={() => navigate(`/files/${entry}`)}
                aria-label={`Open project ${leaf(entry)} in the File Explorer`}
              >
                <span className="fo-home-row-text">
                  <span className="fo-home-row-label">
                    <FolderOpenIcon fontSize="small" aria-hidden="true" /> {leaf(entry)}
                  </span>
                  {rowSecondary(leaf(entry), entry) ? (
                    <span className="fo-home-row-sub">{rowSecondary(leaf(entry), entry)}</span>
                  ) : null}
                </span>
              </button>
              <Button
                size="small"
                startIcon={<DeleteIcon fontSize="small" />}
                aria-label={`Unpin project ${leaf(entry)}`}
                onClick={() => void toggleProject(entry)}
              >
                Unpin
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
