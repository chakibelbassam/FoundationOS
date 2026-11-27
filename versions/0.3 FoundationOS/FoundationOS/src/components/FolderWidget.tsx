import { forwardRef } from 'react';

interface FolderWidgetProps {
  path: string;
  name: string;
  tabIndex?: number;
  onOpen: () => void;
}

export const FolderWidget = forwardRef<HTMLButtonElement, FolderWidgetProps>(function FolderWidget(
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
        aria-label={`${name}, folder. Open.`}
        onClick={onOpen}
        data-target
      >
        <span className="fo-folder-lid" aria-hidden="true" />
        <span className="fo-card-name">{name}</span>
        <span className="fo-card-kind">Folder</span>
        <span className="fo-card-spacer" />
        <span className="fo-card-hint">Open folder</span>
      </button>
    </article>
  );
});
