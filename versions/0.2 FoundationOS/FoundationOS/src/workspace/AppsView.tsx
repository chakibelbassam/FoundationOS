import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Typography from '@mui/material/Typography';
import { useSession } from '../app/SessionContext';
import { usePreferences, motionIsReduced } from '../app/PreferencesContext';
import { getLastInput } from '../app/inputMode';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { AppCard } from '../components/AppCard';
import { StatePanel } from '../components/StatePanel';
import { APP_INVENTORY_SCOPE, useAppInventory } from './useAppInventory';

function leaf(path: string): string {
  const parts = path.split('/').filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : path;
}

export function AppsView() {
  const navigate = useNavigate();
  const { profile } = useSession();
  const { effective } = usePreferences();
  const memberId = profile?.id;
  const pinned = effective.projects ?? [];
  const scopeKey = pinned.join('|');
  const inventory = useAppInventory(memberId, pinned, scopeKey);
  const headingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (getLastInput() === 'keyboard') headingRef.current?.focus();
  }, []);

  const reducedMotion = motionIsReduced(effective.motion);

  const open = (target: string) => {
    navigate(`/app/${target}`, { state: { from: { route: '/apps', path: target } } });
  };

  return (
    <div className="fo-route">
      <Breadcrumbs path="" />
      <Typography variant="h1" className="fo-page-title" tabIndex={-1} ref={headingRef} data-page-heading>
        Apps
      </Typography>
      <Typography variant="body2" className="fo-page-subtitle" color="text.secondary">
        {APP_INVENTORY_SCOPE}{' '}
        {inventory.status === 'ready' ? `${inventory.foldersChecked} folders checked.` : 'Checking folders…'}
      </Typography>

      {inventory.status === 'loading' ? (
        <StatePanel title="Looking for recognised apps" busy />
      ) : inventory.apps.length === 0 ? (
        <StatePanel
          title="No recognised apps here yet"
          body="An app is a folder with an app.json descriptor. Add one to your home or a pinned project, then come back."
          actionLabel="Open File Explorer"
          onAction={() => navigate('/files')}
        />
      ) : (
        <div className="fo-shelf" role="list" aria-label="Recognised apps">
          {inventory.apps.map((app) => (
            <div role="listitem" key={app.path} style={{ display: 'contents' }}>
              <AppCard
                path={app.path}
                name={leaf(app.path)}
                descriptor={app.descriptor}
                reducedMotion={reducedMotion}
                onOpen={() => open(app.path)}
                onBrowse={() => navigate(`/files/${app.path}`)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
