import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { AppCard } from '../components/AppCard';
import { FolderWidget } from '../components/FolderWidget';
import { usePreferences, DEFAULT_PREFERENCES, motionIsReduced } from '../app/PreferencesContext';
import { useSession } from '../app/SessionContext';
import { useServer } from '../app/ServerContext';
import type { Preferences } from '../api/types';

const PAGES = [
  { id: 'profile', label: 'Profile' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'workspace', label: 'Workspace' },
] as const;

type PageId = (typeof PAGES)[number]['id'];

function Options<K extends keyof Preferences>({
  label,
  preference,
  values,
  onChange,
  describe,
}: {
  label: string;
  preference: K;
  values: readonly Preferences[K][];
  onChange: (key: K, value: Preferences[K]) => void;
  describe: (value: Preferences[K]) => string;
}) {
  const { effective } = usePreferences();
  return (
    <div>
      <Typography variant="subtitle2" component="h3">{label}</Typography>
      <div className="fo-option-row" role="group" aria-label={label}>
        {values.map((value) => (
          <button
            key={String(value)}
            type="button"
            className="fo-option"
            aria-pressed={effective[preference] === value}
            onClick={() => onChange(preference, value)}
            data-target
          >
            {describe(value)}
          </button>
        ))}
      </div>
    </div>
  );
}

function Preview() {
  const { effective } = usePreferences();
  const [note, setNote] = useState<string | null>(null);
  return (
    <section aria-label="Live preview" style={{ marginTop: 8 }}>
      <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>Preview on the real widgets</Typography>
      <div className="fo-preview-grid">
        <AppCard
          path="Preview/Weather"
          name="Weather"
          descriptor={{ name: 'Weather', brief: 'Forecasts, radar and the week ahead for your saved places.' }}
          reducedMotion={motionIsReduced(effective.motion)}
          onOpen={() => setNote('Open goes to the app overview. This preview stays in Settings.')}
          onBrowse={() => setNote('Browse files opens the app folder in the workspace.')}
        />
        <FolderWidget path="Preview/Projects" name="Projects" onOpen={() => setNote('A folder opens on one click, tap or Enter.')} />
      </div>
      <Typography variant="body2" sx={{ mt: 1, minHeight: '1.4em' }} role="status">{note}</Typography>
    </section>
  );
}

export function SettingsView() {
  const params = useParams();
  const navigate = useNavigate();
  const { profile } = useSession();
  const { config } = useServer();
  const {
    applied,
    draft,
    loading,
    saveState,
    saveError,
    updateDraft,
    apply,
    cancel,
    reset,
  } = usePreferences();

  const page = (PAGES.some((item) => item.id === params.page) ? params.page : 'profile') as PageId;

  useEffect(() => {
    if (!PAGES.some((item) => item.id === params.page)) navigate('/settings/profile', { replace: true });
  }, [params.page, navigate]);

  useEffect(() => () => cancel(), [cancel]);

  const dirty = draft !== null && JSON.stringify(draft) !== JSON.stringify(applied);

  return (
    <div className="fo-route">
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} data-page-heading>Settings</Typography>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 1 }}>
        Back to workspace
      </Button>
      <div className="fo-settings-nav" role="tablist" aria-label="Settings pages">
        {PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            className="fo-option"
            aria-selected={page === item.id}
            aria-pressed={page === item.id}
            onClick={() => navigate(`/settings/${item.id}`)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? <Alert severity="info">Loading your saved preferences…</Alert> : null}

      {page === 'profile' ? (
        <section aria-label="Profile">
          <div className="fo-panel">
            <Typography variant="h2" component="h2" sx={{ mb: 1 }}>Profile</Typography>
            <Typography variant="body1">Username: <strong>{profile?.name}</strong></Typography>
            <Typography variant="body1">Role: <strong>{profile?.role}</strong></Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Your identity comes from the connected v0.1 server. Profile editing and a profile picker belong to later
              increments; v0.2 uses one active member at a time.
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary">
              One active profile per client session. Refresh returns to Connect. Use Disconnect in the username menu to
              end this session; the server keeps running.
            </Typography>
          </div>
        </section>
      ) : page === 'appearance' ? (
        <section aria-label="Appearance">
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '62ch' }}>
            Compare treatments on the same card and folder you use at Home. Changes preview immediately; Apply keeps
            them for this member.
          </Typography>
          <Options
            label="Theme"
            preference="theme"
            values={['system', 'light', 'dark']}
            onChange={updateDraft}
            describe={(value) => (value === 'system' ? 'System' : value === 'light' ? 'Light' : 'Dark')}
          />
          <Options
            label="Surface"
            preference="surface"
            values={['solid', 'glass']}
            onChange={updateDraft}
            describe={(value) => (value === 'solid' ? 'Solid' : 'Glass')}
          />
          <Preview />
        </section>
      ) : (
        <section aria-label="Workspace">
          <Typography variant="body1" color="text.secondary" sx={{ mb: 2, maxWidth: '62ch' }}>
            Density, motion and cursor change the workspace itself. Motion stays on when Windows asks for reduced motion
            unless you choose Off or Follow system.
          </Typography>
          <Options
            label="Density"
            preference="density"
            values={['comfortable', 'compact']}
            onChange={updateDraft}
            describe={(value) => (value === 'comfortable' ? 'Comfortable' : 'Compact')}
          />
          <Options
            label="Motion"
            preference="motion"
            values={['on', 'off', 'system']}
            onChange={updateDraft}
            describe={(value) => (value === 'on' ? 'On' : value === 'off' ? 'Off' : 'Follow system')}
          />
          <Options
            label="Cursor"
            preference="cursor"
            values={['system', 'target']}
            onChange={updateDraft}
            describe={(value) => (value === 'system' ? 'System cursor' : 'Target cursor')}
          />
          <Preview />
        </section>
      )}

      <div className="fo-settings-actions">
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled={!dirty || saveState === 'saving'}
          onClick={() => void apply()}
        >
          {saveState === 'saving' ? 'Applying…' : 'Apply'}
        </Button>
        <Button variant="outlined" startIcon={<CloseIcon />} disabled={!dirty} onClick={cancel}>
          Cancel
        </Button>
        <Button
          variant="text"
          startIcon={<RestartAltIcon />}
          onClick={() => {
            reset();
          }}
        >
          Reset to defaults
        </Button>
        <Typography variant="body2" color="text.secondary" role="status">
          {saveState === 'saved'
            ? 'Saved for this member.'
            : saveState === 'error'
              ? 'The change was not saved. Retry, or Cancel to return to your saved settings.'
              : draft && JSON.stringify(draft) === JSON.stringify(DEFAULT_PREFERENCES)
                ? 'Defaults previewed. Apply to keep them.'
                : dirty
                  ? 'Previewing unsaved changes.'
                  : 'Showing your saved settings.'}
        </Typography>
      </div>
      {saveState === 'error' && saveError ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          Failed save: {saveError} Your last saved settings are unchanged on disk.
        </Alert>
      ) : null}

      <div className="fo-about">
        FoundationOS client {config?.clientVersion ?? '0.2'} · server{' '}
        {config?.check.version ? `v${config.check.version}` : 'not reachable'} · expected v
        {config?.expectedServerVersion ?? '0.1'}
      </div>
    </div>
  );
}
