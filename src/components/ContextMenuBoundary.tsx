import './ContextMenuBoundary.css';
import type { ReactNode } from 'react';

/** Disable browser context menus by default; opt in around a specific feature. */
export function ContextMenuBoundary({
  children,
  allowNative = false,
}: {
  children: ReactNode;
  allowNative?: boolean;
}) {
  return (
    <div
      className="context-menu-boundary"
      onContextMenu={(event) => {
        if (allowNative) event.stopPropagation();
        else event.preventDefault();
      }}
    >
      {children}
    </div>
  );
}
