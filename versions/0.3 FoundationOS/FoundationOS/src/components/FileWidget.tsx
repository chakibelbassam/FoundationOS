import { forwardRef } from 'react';
import DescriptionIcon from '@mui/icons-material/Description';

interface FileWidgetProps {
  path: string;
  name: string;
  tabIndex?: number;
  onOpen: () => void;
}

export const FileWidget = forwardRef<HTMLButtonElement, FileWidgetProps>(function FileWidget(
  { path, name, tabIndex = 0, onOpen },
  ref,
) {
  return (
    <article className="fo-card" data-card-path={path} data-shelf-item data-target>
      <div className="fo-card-backing" aria-hidden="true" />
      <button
        ref={ref}
        type="button"
        className="fo-folder-button"
        tabIndex={tabIndex}
        aria-label={`${name}, file. Read.`}
        onClick={onOpen}
        data-target
      >
        <span className="fo-card-icon" aria-hidden="true"><DescriptionIcon fontSize="small" /></span>
        <span className="fo-card-name">{name}</span>
        <span className="fo-card-kind">File</span>
        <span className="fo-card-spacer" />
        <span className="fo-card-hint">Read file</span>
      </button>
    </article>
  );
});
