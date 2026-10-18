import './css/ui.css';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react';
import { useId, useState } from 'react';
import { FiCheck, FiX, FiInfo, FiChevronDown } from 'react-icons/fi';
import { GoQuestion } from 'react-icons/go';
import * as Dialog from '@radix-ui/react-dialog';
import * as Popover from '@radix-ui/react-popover';
import { useApp } from '../hooks/useApp';
export function Button({
  children,
  variant = 'secondary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
}) {
  return (
    <button className={`button ${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}
export function IconButton({
  children,
  label,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button className="icon-button" aria-label={label} title={label} {...props}>
      {children}
    </button>
  );
}
export function Field({
  label,
  hint,
  tooltip,
  children,
}: {
  label: string;
  hint?: string;
  tooltip?: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label-row">
        <span>{label}</span>
        {tooltip && <Tooltip text={tooltip} />}
      </span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="select-control">
      <select {...props}>{children}</select>
      <FiChevronDown aria-hidden="true" />
    </span>
  );
}

function Tooltip({ text }: { text: string }) {
  const { state } = useApp();
  const id = useId();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const open = (hovered || focused) && !dismissed;
  return (
    <Popover.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) setDismissed(true);
      }}
    >
      <Popover.Anchor asChild>
        <span
          className="field-tooltip-trigger"
          tabIndex={0}
          role="img"
          aria-label={text}
          aria-describedby={open ? id : undefined}
          onMouseEnter={() => {
            setHovered(true);
            setDismissed(false);
          }}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => {
            setFocused(true);
            setDismissed(false);
          }}
          onBlur={() => setFocused(false)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (open && event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              setDismissed(true);
            }
          }}
        >
          <GoQuestion aria-hidden="true" />
        </span>
      </Popover.Anchor>
      <Popover.Portal>
        <div className="app-shell modal-theme" data-theme={state?.workspace.theme || 'dark'}>
          <Popover.Content
            id={id}
            className="field-tooltip"
            role="tooltip"
            aria-describedby={undefined}
            side="top"
            align="center"
            sideOffset={8}
            collisionPadding={12}
            hideWhenDetached
            onOpenAutoFocus={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => event.preventDefault()}
          >
            {text}
          </Popover.Content>
        </div>
      </Popover.Portal>
    </Popover.Root>
  );
}
export function NumberField({
  label,
  value,
  onChange,
  hint,
  tooltip,
  min = 0,
  max = 1000000,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  tooltip?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  return (
    <Field label={label} hint={hint} tooltip={tooltip}>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => {
          const parsed = e.currentTarget.valueAsNumber;
          // Leave intermediate input such as the minus sign alone so users can
          // type negative values without rerendering away the in-progress edit.
          if (!Number.isFinite(parsed)) return;
          onChange(parsed);
        }}
      />
    </Field>
  );
}
export function Toggle({
  checked,
  onChange,
  label,
  tooltip,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  tooltip?: string;
}) {
  return (
    <label className="toggle-label">
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={`toggle ${checked ? 'on' : ''}`}>
        <span />
      </span>
      <span>{label}</span>
      {tooltip && <Tooltip text={tooltip} />}
    </label>
  );
}
export function Check(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input type="checkbox" {...props} />;
}
export function Badge({ children, tone = 'blue' }: { children: ReactNode; tone?: string }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}
export function Method({ method }: { method: string }) {
  return <span className={`method method-${method.toLowerCase()}`}>{method}</span>;
}
export function Empty({
  icon,
  heading,
  children,
  action,
}: {
  icon: ReactNode;
  heading: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <h3>{heading}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
  className = '',
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  className?: string;
}) {
  const { state } = useApp();
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="app-shell modal-theme" data-theme={state?.workspace.theme || 'dark'}>
          <Dialog.Overlay className="modal-backdrop" />
          <Dialog.Content className={`modal ${wide ? 'wide' : ''} ${className}`}>
            <div className="modal-heading">
              <div>
                <Dialog.Title asChild>
                  <h2>{title}</h2>
                </Dialog.Title>
                <Dialog.Description asChild>
                  <p className={subtitle ? undefined : 'sr-only'}>{subtitle || title}</p>
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button className="icon-button" aria-label="Close dialog">
                  <FiX />
                </button>
              </Dialog.Close>
            </div>
            {children}
          </Dialog.Content>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
export function Alert({ children }: { children: ReactNode }) {
  return (
    <div className="inline-alert">
      <FiInfo />
      {children}
    </div>
  );
}
export function Toast({
  message,
  error,
  onClose,
}: {
  message: string;
  error?: boolean;
  onClose: () => void;
}) {
  return (
    <div key={message} role={error ? 'alert' : 'status'} className={`toast ${error ? 'error' : ''}`}>
      {error ? <FiInfo /> : <FiCheck />}
      <span>{message}</span>
      <IconButton label="Dismiss notification" onClick={onClose}>
        <FiX />
      </IconButton>
    </div>
  );
}
