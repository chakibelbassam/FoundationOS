import { useState } from 'react';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Typography from '@mui/material/Typography';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { useSession } from '../app/SessionContext';

export function RecoveryCodeDialog() {
  const { recoveryCode, clearRecoveryCode } = useSession();
  const [copied, setCopied] = useState(false);

  if (!recoveryCode) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Dialog open onClose={() => undefined} aria-labelledby="recovery-code-title" maxWidth="sm" fullWidth>
      <DialogTitle id="recovery-code-title">Save your recovery code</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          This is the only time FoundationOS shows this code. Store it somewhere safe. You need it if you forget the
          owner password.
        </Alert>
        <Typography
          component="div"
          sx={{ fontFamily: 'monospace', fontSize: 28, letterSpacing: 3, textAlign: 'center', py: 2 }}
          aria-label="Recovery code"
        >
          {recoveryCode}
        </Typography>
        <Button startIcon={<ContentCopyIcon />} onClick={() => void copy()}>
          {copied ? 'Copied' : 'Copy code'}
        </Button>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={clearRecoveryCode}>
          I saved it
        </Button>
      </DialogActions>
    </Dialog>
  );
}
