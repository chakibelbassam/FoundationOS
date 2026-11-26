import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FolderOpenIcon from '@mui/icons-material/FolderOpen';
import DeleteIcon from '@mui/icons-material/DeleteOutline';
import { usePreferences } from '../app/PreferencesContext';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { StatePanel } from '../components/StatePanel';

function leaf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function ProjectsView() {
  const navigate = useNavigate();
  const { effective, saveError, toggleProject } = usePreferences();
  const projects = effective.projects ?? [];

  return (
    <div className="fo-route">
      <Breadcrumbs path="" />
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} data-page-heading>
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
                onClick={() => navigate(`/files/${entry}`)}
                aria-label={`Open project ${leaf(entry)} in the File Explorer`}
              >
                <span className="fo-home-row-text">
                  <span className="fo-home-row-label">
                    <FolderOpenIcon fontSize="small" aria-hidden="true" /> {leaf(entry)}
                  </span>
                  <span className="fo-home-row-sub">{entry}</span>
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
