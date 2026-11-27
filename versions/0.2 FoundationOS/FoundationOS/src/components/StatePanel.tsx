import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { ReactNode } from 'react';

interface StatePanelProps {
  title: string;
  body?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  busy?: boolean;
  tone?: 'neutral' | 'error';
}

export function StatePanel({ title, body, actionLabel, onAction, busy, tone = 'neutral' }: StatePanelProps) {
  return (
    <div className="fo-state" role={tone === 'error' ? 'alert' : 'status'}>
      <strong style={{ fontSize: '1.05rem' }}>{title}</strong>
      {body ? <div style={{ opacity: 0.85 }}>{body}</div> : null}
      {busy ? <CircularProgress size={20} aria-label="Loading" /> : null}
      {actionLabel && onAction ? (
        <Button variant="contained" onClick={onAction}>{actionLabel}</Button>
      ) : null}
    </div>
  );
}
